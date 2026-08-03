/*
===========================================================================
Copyright (C) 1999-2005 Id Software, Inc.

This file is part of Quake III Arena source code.

Quake III Arena source code is free software; you can redistribute it
and/or modify it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 2 of the License,
or (at your option) any later version.

Quake III Arena source code is distributed in the hope that it will be
useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Quake III Arena source code; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
===========================================================================
*/

#include "server.h"
#ifdef USE_SERVER_CURL
#	include <curl/curl.h>
#endif


/*
===============================================================================

OPERATOR CONSOLE ONLY COMMANDS

These commands can only be entered from stdin or by a remote operator datagram
===============================================================================
*/

static cvar_t *sv_killpost_url;
static cvar_t *sv_killpost_debug;
static cvar_t *sv_killpost_client_secret;
static int sv_killpost_lastErrorPrintTime;
#define SV_KILLPOST_DEFAULT_URL "https://master.q3js.com/api/events"
#define SV_KILLPOST_CLIENT_SECRET_HEADER "X-Q3JS-Client-Secret"
#define SV_KILLPOST_MAX_PENDING 128
#ifdef USE_SERVER_CURL
static qboolean sv_killpost_curlInitAttempted;
static qboolean sv_killpost_curlReady;
typedef struct svKillPostRequest_s {
	struct svKillPostRequest_s *next;
	CURL *curl;
	struct curl_slist *headers;
	char *url;
	char *body;
} svKillPostRequest_t;
static CURLM *sv_killpost_multi;
static svKillPostRequest_t *sv_killpost_pendingHead;
static svKillPostRequest_t *sv_killpost_pendingTail;
static svKillPostRequest_t *sv_killpost_activeRequest;
static int sv_killpost_pendingCount;
#endif

static void SV_KillPostInitCvars( void ) {
	if ( !sv_killpost_url ) {
		sv_killpost_url = Cvar_Get( "sv_killpost_url", SV_KILLPOST_DEFAULT_URL, CVAR_ARCHIVE );
	}
	if ( !sv_killpost_debug ) {
		sv_killpost_debug = Cvar_Get( "sv_killpost_debug", "0", CVAR_ARCHIVE );
	}
	if ( !sv_killpost_client_secret ) {
		sv_killpost_client_secret = Cvar_Get( "sv_killpost_client_secret", "", 0 );
	}

	/*
	 * Unquoted URLs passed via +set can be truncated at '//' by the cmd parser,
	 * leaving values like "https:".
	 */
	if ( !Q_stricmp( sv_killpost_url->string, "https:" ) ||
		 !Q_stricmp( sv_killpost_url->string, "http:" ) ) {
		Com_Printf(
			"q3js_killpost: sv_killpost_url value '%s' is truncated; resetting to %s\n",
			sv_killpost_url->string,
			SV_KILLPOST_DEFAULT_URL
		);
		Cvar_SetSafe( "sv_killpost_url", SV_KILLPOST_DEFAULT_URL );
	}
#ifdef USE_SERVER_CURL
	if ( !sv_killpost_curlInitAttempted ) {
		CURLcode curlInitResult;

		sv_killpost_curlInitAttempted = qtrue;
		curlInitResult = curl_global_init( CURL_GLOBAL_DEFAULT );
		if ( curlInitResult == CURLE_OK ) {
			sv_killpost_curlReady = qtrue;
		} else {
			sv_killpost_curlReady = qfalse;
			Com_Printf( "q3js_killpost: curl_global_init failed: %s\n", curl_easy_strerror( curlInitResult ) );
		}
	}
#endif
}

static void QDECL SV_KillPostErrorf( const char *fmt, ... ) {
	va_list argptr;
	char text[1024];
	qboolean throttle;

	SV_KillPostInitCvars();

	throttle = !sv_killpost_debug || !sv_killpost_debug->integer;
	if ( throttle && svs.time - sv_killpost_lastErrorPrintTime < 5000 ) {
		return;
	}
	sv_killpost_lastErrorPrintTime = svs.time;

	va_start( argptr, fmt );
	Q_vsnprintf( text, sizeof( text ), fmt, argptr );
	va_end( argptr );

	Com_Printf( "q3js_killpost: %s\n", text );
}

static void SV_KillPostJSONEscape( const char *input, char *output, size_t outputSize ) {
	size_t outIndex;

	if ( !outputSize ) {
		return;
	}

	outIndex = 0;
	while ( input[0] && outIndex + 1 < outputSize ) {
		const char *escaped = NULL;
		char unicode[7];
		unsigned char c = (unsigned char)*input++;

		switch ( c ) {
		case '\"':
			escaped = "\\\"";
			break;
		case '\\':
			escaped = "\\\\";
			break;
		case '\b':
			escaped = "\\b";
			break;
		case '\f':
			escaped = "\\f";
			break;
		case '\n':
			escaped = "\\n";
			break;
		case '\r':
			escaped = "\\r";
			break;
		case '\t':
			escaped = "\\t";
			break;
		default:
			break;
		}

		if ( !escaped && c < 0x20 ) {
			Com_sprintf( unicode, sizeof( unicode ), "\\u%04x", c );
			escaped = unicode;
		}

		if ( escaped ) {
			size_t i;

			for ( i = 0; escaped[i] && outIndex + 1 < outputSize; i++ ) {
				output[outIndex++] = escaped[i];
			}
		} else {
			output[outIndex++] = (char)c;
		}
	}

	output[outIndex] = '\0';
}

#ifdef USE_SERVER_CURL
static size_t SV_KillPostDiscardResponse( char *ptr, size_t size, size_t nmemb, void *userdata ) {
	(void)ptr;
	(void)userdata;
	return size * nmemb;
}

static void SV_KillPostFreeRequest( svKillPostRequest_t *request ) {
	if ( !request ) {
		return;
	}

	if ( request->headers ) {
		curl_slist_free_all( request->headers );
	}
	if ( request->curl ) {
		curl_easy_cleanup( request->curl );
	}
	if ( request->url ) {
		Z_Free( request->url );
	}
	if ( request->body ) {
		Z_Free( request->body );
	}

	Z_Free( request );
}

static void SV_KillPostCancelActiveRequest( void ) {
	if ( !sv_killpost_activeRequest ) {
		return;
	}

	if ( sv_killpost_multi && sv_killpost_activeRequest->curl ) {
		curl_multi_remove_handle( sv_killpost_multi, sv_killpost_activeRequest->curl );
	}

	SV_KillPostFreeRequest( sv_killpost_activeRequest );
	sv_killpost_activeRequest = NULL;
}

static qboolean SV_KillPostEnsureMulti( void ) {
	if ( !sv_killpost_curlReady ) {
		SV_KillPostErrorf( "libcurl is not initialized" );
		return qfalse;
	}

	if ( !sv_killpost_multi ) {
		sv_killpost_multi = curl_multi_init();
		if ( !sv_killpost_multi ) {
			SV_KillPostErrorf( "curl_multi_init failed" );
			return qfalse;
		}
	}

	return qtrue;
}

static qboolean SV_KillPostEnqueue( const char *url, const char *body ) {
	svKillPostRequest_t *request;

	if ( Q_stricmpn( url, "http://", 7 ) != 0 && Q_stricmpn( url, "https://", 8 ) != 0 ) {
		SV_KillPostErrorf( "invalid URL '%s' (expected http:// or https://)", url );
		return qfalse;
	}

	if ( !SV_KillPostEnsureMulti() ) {
		return qfalse;
	}

	if ( sv_killpost_pendingCount >= SV_KILLPOST_MAX_PENDING ) {
		SV_KillPostErrorf( "dropping event because the async queue is full (%d)", SV_KILLPOST_MAX_PENDING );
		return qfalse;
	}

	request = Z_Malloc( sizeof( *request ) );
	Com_Memset( request, 0, sizeof( *request ) );
	request->url = CopyString( url );
	request->body = CopyString( body );

	if ( sv_killpost_pendingTail ) {
		sv_killpost_pendingTail->next = request;
	} else {
		sv_killpost_pendingHead = request;
	}
	sv_killpost_pendingTail = request;
	sv_killpost_pendingCount++;

	return qtrue;
}

static void SV_KillPostStartNextRequest( void ) {
	svKillPostRequest_t *request;
	CURLMcode multiResult;
	char clientSecretHeader[1024];

	if ( sv_killpost_activeRequest || !sv_killpost_pendingHead ) {
		return;
	}

	request = sv_killpost_pendingHead;
	sv_killpost_pendingHead = request->next;
	if ( !sv_killpost_pendingHead ) {
		sv_killpost_pendingTail = NULL;
	}
	request->next = NULL;
	sv_killpost_pendingCount--;

	request->curl = curl_easy_init();
	if ( !request->curl ) {
		SV_KillPostErrorf( "curl_easy_init failed" );
		SV_KillPostFreeRequest( request );
		return;
	}

	request->headers = curl_slist_append( request->headers, "Content-Type: application/json" );
	if ( sv_killpost_client_secret && sv_killpost_client_secret->string[0] ) {
		if ( strchr( sv_killpost_client_secret->string, '\r' ) ||
			 strchr( sv_killpost_client_secret->string, '\n' ) ) {
			SV_KillPostErrorf( "sv_killpost_client_secret contains invalid header characters" );
			SV_KillPostFreeRequest( request );
			return;
		}

		if ( strlen( sv_killpost_client_secret->string ) + strlen( SV_KILLPOST_CLIENT_SECRET_HEADER ) + 3 >=
			 sizeof( clientSecretHeader ) ) {
			SV_KillPostErrorf( "sv_killpost_client_secret is too long to send" );
			SV_KillPostFreeRequest( request );
			return;
		}

		Com_sprintf(
			clientSecretHeader,
			sizeof( clientSecretHeader ),
			"%s: %s",
			SV_KILLPOST_CLIENT_SECRET_HEADER,
			sv_killpost_client_secret->string
		);
		request->headers = curl_slist_append( request->headers, clientSecretHeader );
	}
	curl_easy_setopt( request->curl, CURLOPT_URL, request->url );
	curl_easy_setopt( request->curl, CURLOPT_POST, 1L );
	curl_easy_setopt( request->curl, CURLOPT_POSTFIELDS, request->body );
	curl_easy_setopt( request->curl, CURLOPT_POSTFIELDSIZE, (long)strlen( request->body ) );
	curl_easy_setopt( request->curl, CURLOPT_HTTPHEADER, request->headers );
	curl_easy_setopt( request->curl, CURLOPT_WRITEFUNCTION, SV_KillPostDiscardResponse );
	curl_easy_setopt( request->curl, CURLOPT_CONNECTTIMEOUT, 2L );
	curl_easy_setopt( request->curl, CURLOPT_TIMEOUT, 4L );
	curl_easy_setopt( request->curl, CURLOPT_NOSIGNAL, 1L );
	curl_easy_setopt( request->curl, CURLOPT_PRIVATE, request );

	multiResult = curl_multi_add_handle( sv_killpost_multi, request->curl );
	if ( multiResult != CURLM_OK ) {
		SV_KillPostErrorf( "curl_multi_add_handle failed: %s", curl_multi_strerror( multiResult ) );
		SV_KillPostFreeRequest( request );
		return;
	}

	sv_killpost_activeRequest = request;
}
#endif

static qboolean SV_KillPostHttpPost( const char *url, const char *body ) {
#ifdef USE_SERVER_CURL
	return SV_KillPostEnqueue( url, body );
#else
	(void)url;
	(void)body;
	SV_KillPostErrorf( "libcurl support is not available in this build" );
	return qfalse;
#endif
}

static qboolean SV_Q3JSGetClient( int clientNum, client_t **clientOut ) {
	if ( clientNum < 0 || clientNum >= sv_maxclients->integer ) {
		return qfalse;
	}

	*clientOut = &svs.clients[clientNum];
	if ( !( *clientOut )->state ) {
		return qfalse;
	}

	return qtrue;
}

static void SV_Q3JSEventPost_f( void ) {
	const char *eventName;
	const char *playerName;
	int clientNum;
	int gameTime;
	const char *mapName;
	client_t *client;
	char playerNameEscaped[2 * MAX_NAME_LENGTH];
	char mapNameEscaped[128];
	char payload[1024];

	if ( !com_sv_running->integer ) {
		return;
	}

	SV_KillPostInitCvars();
	if ( !sv_killpost_url->string[0] ) {
		return;
	}

	if ( Cmd_Argc() < 5 ) {
		return;
	}

	eventName = Cmd_Argv( 1 );
	if ( Q_stricmp( eventName, "join" ) != 0 && Q_stricmp( eventName, "leave" ) != 0 ) {
		return;
	}

	clientNum = atoi( Cmd_Argv( 2 ) );
	gameTime = atoi( Cmd_Argv( 3 ) );
	playerName = Cmd_Argv( 4 );

	if ( clientNum < 0 || clientNum >= sv_maxclients->integer ) {
		return;
	}

	client = &svs.clients[clientNum];
	if ( ( !playerName || !playerName[0] ) && !client->state ) {
		return;
	}

	if ( sv_killpost_debug && sv_killpost_debug->integer ) {
		Com_Printf(
			"q3js_killpost: event=%s player=%d name=%s gameTime=%d map=%s\n",
			eventName,
			clientNum,
			( playerName && playerName[0] ) ? playerName : client->name,
			gameTime,
			sv_mapname ? sv_mapname->string : ""
		);
	}

	mapName = ( sv_mapname && sv_mapname->string ) ? sv_mapname->string : "";

	SV_KillPostJSONEscape(
		( playerName && playerName[0] ) ? playerName : client->name,
		playerNameEscaped,
		sizeof( playerNameEscaped )
	);
	SV_KillPostJSONEscape( mapName, mapNameEscaped, sizeof( mapNameEscaped ) );

	Com_sprintf(
		payload,
		sizeof( payload ),
		"{"
		"\"event\":\"%s\","
		"\"player\":{\"clientNum\":%d,\"name\":\"%s\"},"
		"\"gameTime\":%d,"
		"\"serverTime\":%d,"
		"\"map\":\"%s\""
		"}",
		eventName,
		clientNum,
		playerNameEscaped,
		gameTime,
		svs.time,
		mapNameEscaped
	);

	SV_KillPostHttpPost( sv_killpost_url->string, payload );
}

static void SV_Q3JSKillPost_f( void ) {
	int killerClientNum;
	int victimClientNum;
	int meansOfDeath;
	int gameTime;
	const char *mapName;
	client_t *killerClient;
	client_t *victimClient;
	char killerNameEscaped[2 * MAX_NAME_LENGTH];
	char victimNameEscaped[2 * MAX_NAME_LENGTH];
	char mapNameEscaped[128];
	char payload[2048];

	if ( !com_sv_running->integer ) {
		return;
	}

	SV_KillPostInitCvars();
	if ( !sv_killpost_url->string[0] ) {
		return;
	}

	if ( Cmd_Argc() < 5 ) {
		return;
	}

	killerClientNum = atoi( Cmd_Argv( 1 ) );
	victimClientNum = atoi( Cmd_Argv( 2 ) );
	meansOfDeath = atoi( Cmd_Argv( 3 ) );
	gameTime = atoi( Cmd_Argv( 4 ) );

	if ( !SV_Q3JSGetClient( killerClientNum, &killerClient ) ) {
		return;
	}
	if ( !SV_Q3JSGetClient( victimClientNum, &victimClient ) ) {
		return;
	}

	if ( sv_killpost_debug && sv_killpost_debug->integer ) {
		Com_Printf(
			"q3js_killpost: event killer=%d victim=%d mod=%d gameTime=%d map=%s\n",
			killerClientNum,
			victimClientNum,
			meansOfDeath,
			gameTime,
			sv_mapname ? sv_mapname->string : ""
		);
	}

	mapName = ( sv_mapname && sv_mapname->string ) ? sv_mapname->string : "";

	SV_KillPostJSONEscape( killerClient->name, killerNameEscaped, sizeof( killerNameEscaped ) );
	SV_KillPostJSONEscape( victimClient->name, victimNameEscaped, sizeof( victimNameEscaped ) );
	SV_KillPostJSONEscape( mapName, mapNameEscaped, sizeof( mapNameEscaped ) );

	Com_sprintf(
		payload,
		sizeof( payload ),
		"{"
		"\"event\":\"kill\","
		"\"killer\":{\"clientNum\":%d,\"name\":\"%s\"},"
		"\"victim\":{\"clientNum\":%d,\"name\":\"%s\"},"
		"\"meansOfDeath\":%d,"
		"\"gameTime\":%d,"
		"\"serverTime\":%d,"
		"\"map\":\"%s\""
		"}",
		killerClientNum,
		killerNameEscaped,
		victimClientNum,
		victimNameEscaped,
		meansOfDeath,
		gameTime,
		svs.time,
		mapNameEscaped
	);

	SV_KillPostHttpPost( sv_killpost_url->string, payload );
}

void SV_KillPostFrame( void ) {
#ifdef USE_SERVER_CURL
	int stillRunning;
	CURLMcode multiResult;
	CURLMsg *message;
	int messagesInQueue;

	SV_KillPostInitCvars();

	if ( !sv_killpost_multi ) {
		if ( sv_killpost_pendingHead ) {
			SV_KillPostStartNextRequest();
		} else {
			return;
		}
	}

	if ( !sv_killpost_multi ) {
		return;
	}

	SV_KillPostStartNextRequest();

	stillRunning = 0;
	multiResult = curl_multi_perform( sv_killpost_multi, &stillRunning );
	if ( multiResult != CURLM_OK ) {
		SV_KillPostErrorf( "curl_multi_perform failed: %s", curl_multi_strerror( multiResult ) );
		SV_KillPostCancelActiveRequest();
		return;
	}

	while ( ( message = curl_multi_info_read( sv_killpost_multi, &messagesInQueue ) ) != NULL ) {
		svKillPostRequest_t *request;
		long statusCode;

		if ( message->msg != CURLMSG_DONE ) {
			continue;
		}

		request = NULL;
		statusCode = 0;
		curl_easy_getinfo( message->easy_handle, CURLINFO_PRIVATE, &request );
		curl_easy_getinfo( message->easy_handle, CURLINFO_RESPONSE_CODE, &statusCode );
		curl_multi_remove_handle( sv_killpost_multi, message->easy_handle );

		if ( message->data.result != CURLE_OK ) {
			SV_KillPostErrorf( "request failed: %s", curl_easy_strerror( message->data.result ) );
		} else if ( statusCode < 200 || statusCode >= 300 ) {
			SV_KillPostErrorf( "HTTP status %ld from %s", statusCode, request ? request->url : "killpost endpoint" );
		} else if ( sv_killpost_debug && sv_killpost_debug->integer && request ) {
			Com_Printf( "q3js_killpost: posted event to %s (HTTP %ld)\n", request->url, statusCode );
		}

		if ( request == sv_killpost_activeRequest ) {
			sv_killpost_activeRequest = NULL;
		}
		SV_KillPostFreeRequest( request );
	}

	SV_KillPostStartNextRequest();
#else
#endif
}

void SV_KillPostShutdown( void ) {
#ifdef USE_SERVER_CURL
	svKillPostRequest_t *request;

	SV_KillPostCancelActiveRequest();

	request = sv_killpost_pendingHead;
	while ( request ) {
		svKillPostRequest_t *next = request->next;
		SV_KillPostFreeRequest( request );
		request = next;
	}

	sv_killpost_pendingHead = NULL;
	sv_killpost_pendingTail = NULL;
	sv_killpost_pendingCount = 0;

	if ( sv_killpost_multi ) {
		curl_multi_cleanup( sv_killpost_multi );
		sv_killpost_multi = NULL;
	}
#else
#endif
}


/*
==================
SV_GetPlayerByHandle

Returns the player with player id or name from Cmd_Argv(1)
==================
*/
static client_t *SV_GetPlayerByHandle( void ) {
	client_t	*cl;
	int			i;
	char		*s;
	char		cleanName[64];

	// make sure server is running
	if ( !com_sv_running->integer ) {
		return NULL;
	}

	if ( Cmd_Argc() < 2 ) {
		Com_Printf( "No player specified.\n" );
		return NULL;
	}

	s = Cmd_Argv(1);

	// Check whether this is a numeric player handle
	for(i = 0; s[i] >= '0' && s[i] <= '9'; i++);
	
	if(!s[i])
	{
		int plid = atoi(s);

		// Check for numeric playerid match
		if(plid >= 0 && plid < sv_maxclients->integer)
		{
			cl = &svs.clients[plid];
			
			if(cl->state)
				return cl;
		}
	}

	// check for a name match
	for ( i=0, cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++ ) {
		if ( !cl->state ) {
			continue;
		}
		if ( !Q_stricmp( cl->name, s ) ) {
			return cl;
		}

		Q_strncpyz( cleanName, cl->name, sizeof(cleanName) );
		Q_CleanStr( cleanName );
		if ( !Q_stricmp( cleanName, s ) ) {
			return cl;
		}
	}

	Com_Printf( "Player %s is not on the server\n", s );

	return NULL;
}

/*
==================
SV_GetPlayerByNum

Returns the player with idnum from Cmd_Argv(1)
==================
*/
static client_t *SV_GetPlayerByNum( void ) {
	client_t	*cl;
	int			i;
	int			idnum;
	char		*s;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		return NULL;
	}

	if ( Cmd_Argc() < 2 ) {
		Com_Printf( "No player specified.\n" );
		return NULL;
	}

	s = Cmd_Argv(1);

	for (i = 0; s[i]; i++) {
		if (s[i] < '0' || s[i] > '9') {
			Com_Printf( "Bad slot number: %s\n", s);
			return NULL;
		}
	}
	idnum = atoi( s );
	if ( idnum < 0 || idnum >= sv_maxclients->integer ) {
		Com_Printf( "Bad client slot: %i\n", idnum );
		return NULL;
	}

	cl = &svs.clients[idnum];
	if ( !cl->state ) {
		Com_Printf( "Client %i is not active\n", idnum );
		return NULL;
	}
	return cl;
}

//=========================================================


/*
==================
SV_Map_f

Restart the server on a different map
==================
*/
static void SV_Map_f( void ) {
	char		*cmd;
	char		*map;
	qboolean	killBots, cheat;
	char		expanded[MAX_QPATH];
	char		mapname[MAX_QPATH];

	map = Cmd_Argv(1);
	if ( !map ) {
		return;
	}

	// make sure the level exists before trying to change, so that
	// a typo at the server console won't end the game
	Com_sprintf (expanded, sizeof(expanded), "maps/%s.bsp", map);
	if ( FS_ReadFile (expanded, NULL) == -1 ) {
		Com_Printf ("Can't find map %s\n", expanded);
		return;
	}

	// force latched values to get set
	Cvar_Get ("g_gametype", "0", CVAR_SERVERINFO | CVAR_USERINFO | CVAR_LATCH );

	cmd = Cmd_Argv(0);
	if( Q_stricmpn( cmd, "sp", 2 ) == 0 ) {
		Cvar_SetValue( "g_gametype", GT_SINGLE_PLAYER );
		Cvar_SetValue( "g_doWarmup", 0 );
		// may not set sv_maxclients directly, always set latched
		Cvar_SetLatched( "sv_maxclients", "8" );
		cmd += 2;
		if (!Q_stricmp( cmd, "devmap" ) ) {
			cheat = qtrue;
		} else {
			cheat = qfalse;
		}
		killBots = qtrue;
	}
	else {
		if ( !Q_stricmp( cmd, "devmap" ) ) {
			cheat = qtrue;
			killBots = qtrue;
		} else {
			cheat = qfalse;
			killBots = qfalse;
		}
		if( sv_gametype->integer == GT_SINGLE_PLAYER ) {
			Cvar_SetValue( "g_gametype", GT_FFA );
		}
	}

	// save the map name here cause on a map restart we reload the q3config.cfg
	// and thus nuke the arguments of the map command
	Q_strncpyz(mapname, map, sizeof(mapname));

	// start up the map
	SV_SpawnServer( mapname, killBots );

	// set the cheat value
	// if the level was started with "map <levelname>", then
	// cheats will not be allowed.  If started with "devmap <levelname>"
	// then cheats will be allowed
	if ( cheat ) {
		Cvar_Set( "sv_cheats", "1" );
	} else {
		Cvar_Set( "sv_cheats", "0" );
	}
}

/*
================
SV_MapRestart_f

Completely restarts a level, but doesn't send a new gamestate to the clients.
This allows fair starts with variable load times.
================
*/
static void SV_MapRestart_f( void ) {
	int			i;
	client_t	*client;
	char		*denied;
	qboolean	isBot;
	int			delay;

	// make sure we aren't restarting twice in the same frame
	if ( com_frameTime == sv.serverId ) {
		return;
	}

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( sv.restartTime ) {
		return;
	}

	if (Cmd_Argc() > 1 ) {
		delay = atoi( Cmd_Argv(1) );
	}
	else {
		delay = 5;
	}
	if( delay && !Cvar_VariableValue("g_doWarmup") ) {
		sv.restartTime = sv.time + delay * 1000;
		SV_SetConfigstring( CS_WARMUP, va("%i", sv.restartTime) );
		return;
	}

	// check for changes in variables that can't just be restarted
	// check for maxclients change
	if ( sv_maxclients->modified || sv_gametype->modified ) {
		char	mapname[MAX_QPATH];

		Com_Printf( "variable change -- restarting.\n" );
		// restart the map the slow way
		Q_strncpyz( mapname, Cvar_VariableString( "mapname" ), sizeof( mapname ) );

		SV_SpawnServer( mapname, qfalse );
		return;
	}

	// toggle the server bit so clients can detect that a
	// map_restart has happened
	svs.snapFlagServerBit ^= SNAPFLAG_SERVERCOUNT;

	// generate a new serverid	
	// TTimo - don't update restartedserverId there, otherwise we won't deal correctly with multiple map_restart
	sv.serverId = com_frameTime;
	Cvar_Set( "sv_serverid", va("%i", sv.serverId ) );

	// if a map_restart occurs while a client is changing maps, we need
	// to give them the correct time so that when they finish loading
	// they don't violate the backwards time check in cl_cgame.c
	for (i=0 ; i<sv_maxclients->integer ; i++) {
		if (svs.clients[i].state == CS_PRIMED) {
			svs.clients[i].oldServerTime = sv.restartTime;
		}
	}

	// reset all the vm data in place without changing memory allocation
	// note that we do NOT set sv.state = SS_LOADING, so configstrings that
	// had been changed from their default values will generate broadcast updates
	sv.state = SS_LOADING;
	sv.restarting = qtrue;

	SV_RestartGameProgs();

	// run a few frames to allow everything to settle
	for (i = 0; i < 3; i++)
	{
		VM_Call (gvm, GAME_RUN_FRAME, sv.time);
		sv.time += 100;
		svs.time += 100;
	}

	sv.state = SS_GAME;
	sv.restarting = qfalse;

	// connect and begin all the clients
	for (i=0 ; i<sv_maxclients->integer ; i++) {
		client = &svs.clients[i];

		// send the new gamestate to all connected clients
		if ( client->state < CS_CONNECTED) {
			continue;
		}

		if ( client->netchan.remoteAddress.type == NA_BOT ) {
			isBot = qtrue;
		} else {
			isBot = qfalse;
		}

		// add the map_restart command
		SV_AddServerCommand( client, "map_restart\n" );

		// connect the client again, without the firstTime flag
		denied = VM_ExplicitArgPtr( gvm, VM_Call( gvm, GAME_CLIENT_CONNECT, i, qfalse, isBot ) );
		if ( denied ) {
			// this generally shouldn't happen, because the client
			// was connected before the level change
			SV_DropClient( client, denied );
			Com_Printf( "SV_MapRestart_f(%d): dropped client %i - denied!\n", delay, i );
			continue;
		}

		if(client->state == CS_ACTIVE)
			SV_ClientEnterWorld(client, &client->lastUsercmd);
		else
		{
			// If we don't reset client->lastUsercmd and are restarting during map load,
			// the client will hang because we'll use the last Usercmd from the previous map,
			// which is wrong obviously.
			SV_ClientEnterWorld(client, NULL);
		}
	}	

	// run another frame to allow things to look at all the players
	VM_Call (gvm, GAME_RUN_FRAME, sv.time);
	sv.time += 100;
	svs.time += 100;
}

//===============================================================

/*
==================
SV_Kick_f

Kick a user off of the server
==================
*/
static void SV_Kick_f( void ) {
	client_t	*cl;
	int			i;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() != 2 ) {
		Com_Printf ("Usage: kick <player name>\nkick all = kick everyone\nkick allbots = kick all bots\n");
		return;
	}

	cl = SV_GetPlayerByHandle();
	if ( !cl ) {
		if ( !Q_stricmp(Cmd_Argv(1), "all") ) {
			for ( i=0, cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++ ) {
				if ( !cl->state ) {
					continue;
				}
				if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
					continue;
				}
				SV_DropClient( cl, "was kicked" );
				cl->lastPacketTime = svs.time;	// in case there is a funny zombie
			}
		}
		else if ( !Q_stricmp(Cmd_Argv(1), "allbots") ) {
			for ( i=0, cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++ ) {
				if ( !cl->state ) {
					continue;
				}
				if( cl->netchan.remoteAddress.type != NA_BOT ) {
					continue;
				}
				SV_DropClient( cl, "was kicked" );
				cl->lastPacketTime = svs.time;	// in case there is a funny zombie
			}
		}
		return;
	}
	if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
		Com_Printf("Cannot kick host player\n");
		return;
	}

	SV_DropClient( cl, "was kicked" );
	cl->lastPacketTime = svs.time;	// in case there is a funny zombie
}

/*
==================
SV_KickBots_f

Kick all bots off of the server
==================
*/
static void SV_KickBots_f( void ) {
	client_t	*cl;
	int			i;

	// make sure server is running
	if( !com_sv_running->integer ) {
		Com_Printf("Server is not running.\n");
		return;
	}

	for( i = 0, cl = svs.clients; i < sv_maxclients->integer; i++, cl++ ) {
		if( !cl->state ) {
			continue;
		}

		if( cl->netchan.remoteAddress.type != NA_BOT ) {
			continue;
		}

		SV_DropClient( cl, "was kicked" );
		cl->lastPacketTime = svs.time; // in case there is a funny zombie
	}
}
/*
==================
SV_KickAll_f

Kick all users off of the server
==================
*/
static void SV_KickAll_f( void ) {
	client_t *cl;
	int i;

	// make sure server is running
	if( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	for( i = 0, cl = svs.clients; i < sv_maxclients->integer; i++, cl++ ) {
		if( !cl->state ) {
			continue;
		}

		if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
			continue;
		}

		SV_DropClient( cl, "was kicked" );
		cl->lastPacketTime = svs.time; // in case there is a funny zombie
	}
}

/*
==================
SV_KickNum_f

Kick a user off of the server
==================
*/
static void SV_KickNum_f( void ) {
	client_t	*cl;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() != 2 ) {
		Com_Printf ("Usage: %s <client number>\n", Cmd_Argv(0));
		return;
	}

	cl = SV_GetPlayerByNum();
	if ( !cl ) {
		return;
	}
	if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
		Com_Printf("Cannot kick host player\n");
		return;
	}

	SV_DropClient( cl, "was kicked" );
	cl->lastPacketTime = svs.time;	// in case there is a funny zombie
}

#ifndef STANDALONE
// these functions require the auth server which of course is not available anymore for stand-alone games.

/*
==================
SV_Ban_f

Ban a user from being able to play on this server through the auth
server
==================
*/
static void SV_Ban_f( void ) {
	client_t	*cl;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() != 2 ) {
		Com_Printf ("Usage: banUser <player name>\n");
		return;
	}

	cl = SV_GetPlayerByHandle();

	if (!cl) {
		return;
	}

	if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
		Com_Printf("Cannot kick host player\n");
		return;
	}

	// look up the authorize server's IP
	if ( !svs.authorizeAddress.ip[0] && svs.authorizeAddress.type != NA_BAD ) {
		Com_Printf( "Resolving %s\n", AUTHORIZE_SERVER_NAME );
		if ( !NET_StringToAdr( AUTHORIZE_SERVER_NAME, &svs.authorizeAddress, NA_IP ) ) {
			Com_Printf( "Couldn't resolve address\n" );
			return;
		}
		svs.authorizeAddress.port = BigShort( PORT_AUTHORIZE );
		Com_Printf( "%s resolved to %i.%i.%i.%i:%i\n", AUTHORIZE_SERVER_NAME,
			svs.authorizeAddress.ip[0], svs.authorizeAddress.ip[1],
			svs.authorizeAddress.ip[2], svs.authorizeAddress.ip[3],
			BigShort( svs.authorizeAddress.port ) );
	}

	// otherwise send their ip to the authorize server
	if ( svs.authorizeAddress.type != NA_BAD ) {
		NET_OutOfBandPrint( NS_SERVER, svs.authorizeAddress,
			"banUser %i.%i.%i.%i", cl->netchan.remoteAddress.ip[0], cl->netchan.remoteAddress.ip[1], 
								   cl->netchan.remoteAddress.ip[2], cl->netchan.remoteAddress.ip[3] );
		Com_Printf("%s was banned from coming back\n", cl->name);
	}
}

/*
==================
SV_BanNum_f

Ban a user from being able to play on this server through the auth
server
==================
*/
static void SV_BanNum_f( void ) {
	client_t	*cl;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() != 2 ) {
		Com_Printf ("Usage: banClient <client number>\n");
		return;
	}

	cl = SV_GetPlayerByNum();
	if ( !cl ) {
		return;
	}
	if( cl->netchan.remoteAddress.type == NA_LOOPBACK ) {
		Com_Printf("Cannot kick host player\n");
		return;
	}

	// look up the authorize server's IP
	if ( !svs.authorizeAddress.ip[0] && svs.authorizeAddress.type != NA_BAD ) {
		Com_Printf( "Resolving %s\n", AUTHORIZE_SERVER_NAME );
		if ( !NET_StringToAdr( AUTHORIZE_SERVER_NAME, &svs.authorizeAddress, NA_IP ) ) {
			Com_Printf( "Couldn't resolve address\n" );
			return;
		}
		svs.authorizeAddress.port = BigShort( PORT_AUTHORIZE );
		Com_Printf( "%s resolved to %i.%i.%i.%i:%i\n", AUTHORIZE_SERVER_NAME,
			svs.authorizeAddress.ip[0], svs.authorizeAddress.ip[1],
			svs.authorizeAddress.ip[2], svs.authorizeAddress.ip[3],
			BigShort( svs.authorizeAddress.port ) );
	}

	// otherwise send their ip to the authorize server
	if ( svs.authorizeAddress.type != NA_BAD ) {
		NET_OutOfBandPrint( NS_SERVER, svs.authorizeAddress,
			"banUser %i.%i.%i.%i", cl->netchan.remoteAddress.ip[0], cl->netchan.remoteAddress.ip[1], 
								   cl->netchan.remoteAddress.ip[2], cl->netchan.remoteAddress.ip[3] );
		Com_Printf("%s was banned from coming back\n", cl->name);
	}
}
#endif

/*
==================
SV_RehashBans_f

Load saved bans from file.
==================
*/
static void SV_RehashBans_f(void)
{
	int index, filelen;
	fileHandle_t readfrom;
	char *textbuf, *curpos, *maskpos, *newlinepos, *endpos;
	char filepath[MAX_QPATH];
	
	serverBansCount = 0;
	
	if(!sv_banFile->string || !*sv_banFile->string)
		return;

	Com_sprintf(filepath, sizeof(filepath), "%s/%s", FS_GetCurrentGameDir(), sv_banFile->string);

	if((filelen = FS_BaseDir_FOpenFileRead(filepath, &readfrom)) >= 0)
	{
		if(filelen < 2)
		{
			// Don't bother if file is too short.
			FS_FCloseFile(readfrom);
			return;
		}

		curpos = textbuf = Z_Malloc(filelen);
		
		filelen = FS_Read(textbuf, filelen, readfrom);
		FS_FCloseFile(readfrom);
		
		endpos = textbuf + filelen;
		
		for(index = 0; index < SERVER_MAXBANS && curpos + 2 < endpos; index++)
		{
			// find the end of the address string
			for(maskpos = curpos + 2; maskpos < endpos && *maskpos != ' '; maskpos++);
			
			if(maskpos + 1 >= endpos)
				break;

			*maskpos = '\0';
			maskpos++;
			
			// find the end of the subnet specifier
			for(newlinepos = maskpos; newlinepos < endpos && *newlinepos != '\n'; newlinepos++);
			
			if(newlinepos >= endpos)
				break;
			
			*newlinepos = '\0';
			
			if(NET_StringToAdr(curpos + 2, &serverBans[index].ip, NA_UNSPEC))
			{
				serverBans[index].isexception = (curpos[0] != '0');
				serverBans[index].subnet = atoi(maskpos);
				
				if(serverBans[index].ip.type == NA_IP &&
				   (serverBans[index].subnet < 1 || serverBans[index].subnet > 32))
				{
					serverBans[index].subnet = 32;
				}
				else if(serverBans[index].ip.type == NA_IP6 &&
					(serverBans[index].subnet < 1 || serverBans[index].subnet > 128))
				{
					serverBans[index].subnet = 128;
				}
			}
			
			curpos = newlinepos + 1;
		}
			
		serverBansCount = index;
		
		Z_Free(textbuf);
	}
}

/*
==================
SV_WriteBans

Save bans to file.
==================
*/
static void SV_WriteBans(void)
{
	int index;
	fileHandle_t writeto;
	char filepath[MAX_QPATH];
	
	if(!sv_banFile->string || !*sv_banFile->string)
		return;
	
	Com_sprintf(filepath, sizeof(filepath), "%s/%s", FS_GetCurrentGameDir(), sv_banFile->string);

	if((writeto = FS_BaseDir_FOpenFileWrite_HomeState(filepath)))
	{
		char writebuf[128];
		serverBan_t *curban;
		
		for(index = 0; index < serverBansCount; index++)
		{
			curban = &serverBans[index];
			
			Com_sprintf(writebuf, sizeof(writebuf), "%d %s %d\n",
				    curban->isexception, NET_AdrToString(curban->ip), curban->subnet);
			FS_Write(writebuf, strlen(writebuf), writeto);
		}

		FS_FCloseFile(writeto);
	}
}

/*
==================
SV_DelBanEntryFromList

Remove a ban or an exception from the list.
==================
*/

static qboolean SV_DelBanEntryFromList(int index)
{
	if(index == serverBansCount - 1)
		serverBansCount--;
	else if(index < ARRAY_LEN(serverBans) - 1)
	{
		memmove(serverBans + index, serverBans + index + 1, (serverBansCount - index - 1) * sizeof(*serverBans));
		serverBansCount--;
	}
	else
		return qtrue;

	return qfalse;
}

/*
==================
SV_ParseCIDRNotation

Parse a CIDR notation type string and return a netadr_t and suffix by reference
==================
*/

static qboolean SV_ParseCIDRNotation(netadr_t *dest, int *mask, char *adrstr)
{
	char *suffix;
	
	suffix = strchr(adrstr, '/');
	if(suffix)
	{
		*suffix = '\0';
		suffix++;
	}

	if(!NET_StringToAdr(adrstr, dest, NA_UNSPEC))
		return qtrue;

	if(suffix)
	{
		*mask = atoi(suffix);
		
		if(dest->type == NA_IP)
		{
			if(*mask < 1 || *mask > 32)
				*mask = 32;
		}
		else
		{
			if(*mask < 1 || *mask > 128)
				*mask = 128;
		}
	}
	else if(dest->type == NA_IP)
		*mask = 32;
	else
		*mask = 128;
	
	return qfalse;
}

/*
==================
SV_AddBanToList

Ban a user from being able to play on this server based on his ip address.
==================
*/

static void SV_AddBanToList(qboolean isexception)
{
	char *banstring;
	char addy2[NET_ADDRSTRMAXLEN];
	netadr_t ip;
	int index, argc, mask;
	serverBan_t *curban;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	argc = Cmd_Argc();
	
	if(argc < 2 || argc > 3)
	{
		Com_Printf ("Usage: %s (ip[/subnet] | clientnum [subnet])\n", Cmd_Argv(0));
		return;
	}

	if(serverBansCount >= ARRAY_LEN(serverBans))
	{
		Com_Printf ("Error: Maximum number of bans/exceptions exceeded.\n");
		return;
	}

	banstring = Cmd_Argv(1);
	
	if(strchr(banstring, '.') || strchr(banstring, ':'))
	{
		// This is an ip address, not a client num.
		
		if(SV_ParseCIDRNotation(&ip, &mask, banstring))
		{
			Com_Printf("Error: Invalid address %s\n", banstring);
			return;
		}
	}
	else
	{
		client_t *cl;
		
		// client num.
		
		cl = SV_GetPlayerByNum();

		if(!cl)
		{
			Com_Printf("Error: Playernum %s does not exist.\n", Cmd_Argv(1));
			return;
		}
		
		ip = cl->netchan.remoteAddress;
		
		if(argc == 3)
		{
			mask = atoi(Cmd_Argv(2));
			
			if(ip.type == NA_IP)
			{
				if(mask < 1 || mask > 32)
					mask = 32;
			}
			else
			{
				if(mask < 1 || mask > 128)
					mask = 128;
			}
		}
		else
			mask = (ip.type == NA_IP6) ? 128 : 32;
	}

	if(ip.type != NA_IP && ip.type != NA_IP6)
	{
		Com_Printf("Error: Can ban players connected via the internet only.\n");
		return;
	}

	// first check whether a conflicting ban exists that would supersede the new one.
	for(index = 0; index < serverBansCount; index++)
	{
		curban = &serverBans[index];
		
		if(curban->subnet <= mask)
		{
			if((curban->isexception || !isexception) && NET_CompareBaseAdrMask(curban->ip, ip, curban->subnet))
			{
				Q_strncpyz(addy2, NET_AdrToString(ip), sizeof(addy2));
				
				Com_Printf("Error: %s %s/%d supersedes %s %s/%d\n", curban->isexception ? "Exception" : "Ban",
					   NET_AdrToString(curban->ip), curban->subnet,
					   isexception ? "exception" : "ban", addy2, mask);
				return;
			}
		}
		if(curban->subnet >= mask)
		{
			if(!curban->isexception && isexception && NET_CompareBaseAdrMask(curban->ip, ip, mask))
			{
				Q_strncpyz(addy2, NET_AdrToString(curban->ip), sizeof(addy2));
			
				Com_Printf("Error: %s %s/%d supersedes already existing %s %s/%d\n", isexception ? "Exception" : "Ban",
					   NET_AdrToString(ip), mask,
					   curban->isexception ? "exception" : "ban", addy2, curban->subnet);
				return;
			}
		}
	}

	// now delete bans that are superseded by the new one
	index = 0;
	while(index < serverBansCount)
	{
		curban = &serverBans[index];
		
		if(curban->subnet > mask && (!curban->isexception || isexception) && NET_CompareBaseAdrMask(curban->ip, ip, mask))
			SV_DelBanEntryFromList(index);
		else
			index++;
	}

	serverBans[serverBansCount].ip = ip;
	serverBans[serverBansCount].subnet = mask;
	serverBans[serverBansCount].isexception = isexception;
	
	serverBansCount++;
	
	SV_WriteBans();

	Com_Printf("Added %s: %s/%d\n", isexception ? "ban exception" : "ban",
		   NET_AdrToString(ip), mask);
}

/*
==================
SV_DelBanFromList

Remove a ban or an exception from the list.
==================
*/

static void SV_DelBanFromList(qboolean isexception)
{
	int index, count = 0, todel, mask;
	netadr_t ip;
	char *banstring;
	
	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}
	
	if(Cmd_Argc() != 2)
	{
		Com_Printf ("Usage: %s (ip[/subnet] | num)\n", Cmd_Argv(0));
		return;
	}

	banstring = Cmd_Argv(1);
	
	if(strchr(banstring, '.') || strchr(banstring, ':'))
	{
		serverBan_t *curban;
		
		if(SV_ParseCIDRNotation(&ip, &mask, banstring))
		{
			Com_Printf("Error: Invalid address %s\n", banstring);
			return;
		}
		
		index = 0;
		
		while(index < serverBansCount)
		{
			curban = &serverBans[index];
			
			if(curban->isexception == isexception		&&
			   curban->subnet >= mask 			&&
			   NET_CompareBaseAdrMask(curban->ip, ip, mask))
			{
				Com_Printf("Deleting %s %s/%d\n",
					   isexception ? "exception" : "ban",
					   NET_AdrToString(curban->ip), curban->subnet);
					   
				SV_DelBanEntryFromList(index);
			}
			else
				index++;
		}
	}
	else
	{
		todel = atoi(Cmd_Argv(1));

		if(todel < 1 || todel > serverBansCount)
		{
			Com_Printf("Error: Invalid ban number given\n");
			return;
		}
	
		for(index = 0; index < serverBansCount; index++)
		{
			if(serverBans[index].isexception == isexception)
			{
				count++;
			
				if(count == todel)
				{
					Com_Printf("Deleting %s %s/%d\n",
					   isexception ? "exception" : "ban",
					   NET_AdrToString(serverBans[index].ip), serverBans[index].subnet);

					SV_DelBanEntryFromList(index);

					break;
				}
			}
		}
	}
	
	SV_WriteBans();
}


/*
==================
SV_ListBans_f

List all bans and exceptions on console
==================
*/

static void SV_ListBans_f(void)
{
	int index, count;
	serverBan_t *ban;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}
	
	// List all bans
	for(index = count = 0; index < serverBansCount; index++)
	{
		ban = &serverBans[index];
		if(!ban->isexception)
		{
			count++;

			Com_Printf("Ban #%d: %s/%d\n", count,
				    NET_AdrToString(ban->ip), ban->subnet);
		}
	}
	// List all exceptions
	for(index = count = 0; index < serverBansCount; index++)
	{
		ban = &serverBans[index];
		if(ban->isexception)
		{
			count++;

			Com_Printf("Except #%d: %s/%d\n", count,
				    NET_AdrToString(ban->ip), ban->subnet);
		}
	}
}

/*
==================
SV_FlushBans_f

Delete all bans and exceptions.
==================
*/

static void SV_FlushBans_f(void)
{
	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	serverBansCount = 0;
	
	// empty the ban file.
	SV_WriteBans();
	
	Com_Printf("All bans and exceptions have been deleted.\n");
}

static void SV_BanAddr_f(void)
{
	SV_AddBanToList(qfalse);
}

static void SV_ExceptAddr_f(void)
{
	SV_AddBanToList(qtrue);
}

static void SV_BanDel_f(void)
{
	SV_DelBanFromList(qfalse);
}

static void SV_ExceptDel_f(void)
{
	SV_DelBanFromList(qtrue);
}

/*
** SV_Strlen -- skips color escape codes
*/
static int SV_Strlen( const char *str ) {
	const char *s = str;
	int count = 0;

	while ( *s ) {
		if ( Q_IsColorString( s ) ) {
			s += 2;
		} else {
			count++;
			s++;
		}
	}

	return count;
}

/*
================
SV_Status_f
================
*/
static void SV_Status_f( void ) {
	int			i, j, l;
	client_t	*cl;
	playerState_t	*ps;
	const char		*s;
	int			ping;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	Com_Printf ("map: %s\n", sv_mapname->string );

	Com_Printf ("cl score ping name            address                                 rate \n");
	Com_Printf ("-- ----- ---- --------------- --------------------------------------- -----\n");
	for (i=0,cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++)
	{
		if (!cl->state)
			continue;
		Com_Printf ("%2i ", i);
		ps = SV_GameClientNum( i );
		Com_Printf ("%5i ", ps->persistant[PERS_SCORE]);

		if (cl->state == CS_CONNECTED)
			Com_Printf ("CON ");
		else if (cl->state == CS_ZOMBIE)
			Com_Printf ("ZMB ");
		else
		{
			ping = cl->ping < 9999 ? cl->ping : 9999;
			Com_Printf ("%4i ", ping);
		}

		Com_Printf ("%s", cl->name);
		
		l = 16 - SV_Strlen(cl->name);
		j = 0;
		
		do
		{
			Com_Printf (" ");
			j++;
		} while(j < l);


		// TTimo adding a ^7 to reset the color
		s = NET_AdrToString( cl->netchan.remoteAddress );
		Com_Printf ("^7%s", s);
		l = 39 - strlen(s);
		j = 0;
		
		do
		{
			Com_Printf(" ");
			j++;
		} while(j < l);
		
		Com_Printf (" %5i", cl->rate);

		Com_Printf ("\n");
	}
	Com_Printf ("\n");
}

/*
==================
SV_ConSay_f
==================
*/
static void SV_ConSay_f(void) {
	char	*p;
	char	text[1024];

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc () < 2 ) {
		return;
	}

	strcpy (text, "console: ");
	p = Cmd_Args();

	if ( *p == '"' ) {
		p++;
		p[strlen(p)-1] = 0;
	}

	strcat(text, p);

	Com_Printf("%s\n", text);
	SV_SendServerCommand(NULL, "chat \"%s\"", text);
}

/*
==================
SV_ConTell_f
==================
*/
static void SV_ConTell_f(void) {
	char	*p;
	char	text[1024];
	client_t	*cl;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() < 3 ) {
		Com_Printf ("Usage: tell <client number> <text>\n");
		return;
	}

	cl = SV_GetPlayerByNum();
	if ( !cl ) {
		return;
	}

	strcpy (text, "console_tell: ");
	p = Cmd_ArgsFrom(2);

	if ( *p == '"' ) {
		p++;
		p[strlen(p)-1] = 0;
	}

	strcat(text, p);

	Com_Printf("%s\n", text);
	SV_SendServerCommand(cl, "chat \"%s\"", text);
}


/*
==================
SV_ConSayto_f
==================
*/
static void SV_ConSayto_f(void) {
	char		*p;
	char		text[1024];
	client_t	*cl;
	char		*rawname;
	char		name[MAX_NAME_LENGTH];
	char		cleanName[MAX_NAME_LENGTH];
	client_t	*saytocl;
	int			i;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() < 3 ) {
		Com_Printf ("Usage: sayto <player name> <text>\n");
		return;
	}

	rawname = Cmd_Argv(1);
	
	//allowing special characters in the console 
	//with hex strings for player names
	Com_FieldStringToPlayerName( name, MAX_NAME_LENGTH, rawname );

	saytocl = NULL;
	for ( i=0, cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++ ) {
		if ( !cl->state ) {
			continue;
		}
		Q_strncpyz( cleanName, cl->name, sizeof(cleanName) );
		Q_CleanStr( cleanName );

		if ( !Q_stricmp( cleanName, name ) ) {
			saytocl = cl;
			break;
		}
	}
	if( !saytocl )
	{
		Com_Printf ("No such player name: %s.\n", name);
		return;
	}

	strcpy (text, "console_sayto: ");
	p = Cmd_ArgsFrom(2);

	if ( *p == '"' ) {
		p++;
		p[strlen(p)-1] = 0;
	}

	strcat(text, p);

	Com_Printf("%s\n", text);
	SV_SendServerCommand(saytocl, "chat \"%s\"", text);
}


/*
==================
SV_Heartbeat_f

Also called by SV_DropClient, SV_DirectConnect, and SV_SpawnServer
==================
*/
void SV_Heartbeat_f( void ) {
	svs.nextHeartbeatTime = -9999999;
}


/*
===========
SV_Serverinfo_f

Examine the serverinfo string
===========
*/
static void SV_Serverinfo_f( void ) {
	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	Com_Printf ("Server info settings:\n");
	Info_Print ( Cvar_InfoString( CVAR_SERVERINFO ) );
}


/*
===========
SV_Systeminfo_f

Examine the systeminfo string
===========
*/
static void SV_Systeminfo_f( void ) {
	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	Com_Printf ("System info settings:\n");
	Info_Print ( Cvar_InfoString_Big( CVAR_SYSTEMINFO ) );
}


/*
===========
SV_DumpUser_f

Examine all a users info strings
===========
*/
static void SV_DumpUser_f( void ) {
	client_t	*cl;

	// make sure server is running
	if ( !com_sv_running->integer ) {
		Com_Printf( "Server is not running.\n" );
		return;
	}

	if ( Cmd_Argc() != 2 ) {
		Com_Printf ("Usage: dumpuser <userid>\n");
		return;
	}

	cl = SV_GetPlayerByHandle();
	if ( !cl ) {
		return;
	}

	Com_Printf( "userinfo\n" );
	Com_Printf( "--------\n" );
	Info_Print( cl->userinfo );
}


/*
=================
SV_KillServer
=================
*/
static void SV_KillServer_f( void ) {
	SV_Shutdown( "killserver" );
}

//===========================================================

/*
==================
SV_CompleteMapName
==================
*/
static void SV_CompleteMapName( char *args, int argNum ) {
	if( argNum == 2 ) {
		Field_CompleteFilename( "maps", "bsp", NULL, qtrue, qfalse );
	}
}

/*
==================
SV_CompletePlayerName
==================
*/
static void SV_CompletePlayerName( char *args, int argNum ) {
	if( argNum == 2 ) {
		char		names[MAX_CLIENTS][MAX_NAME_LENGTH];
		const char	*namesPtr[MAX_CLIENTS];
		client_t	*cl;
		int			i;
		int			nameCount;
		int			clientCount;

		nameCount = 0;
		clientCount = sv_maxclients->integer;

		for ( i=0, cl=svs.clients ; i < clientCount; i++,cl++ ) {
			if ( !cl->state ) {
				continue;
			}
			if( i >= MAX_CLIENTS ) {
				break;
			}
			Q_strncpyz( names[nameCount], cl->name, sizeof(names[nameCount]) );
			Q_CleanStr( names[nameCount] );

			namesPtr[nameCount] = names[nameCount];

			nameCount++;
		}
		qsort( (void*)namesPtr, nameCount, sizeof( namesPtr[0] ), Com_strCompare );

		Field_CompletePlayerName( namesPtr, nameCount );
	}
}

/*
==================
SV_AddOperatorCommands
==================
*/
void SV_AddOperatorCommands( void ) {
	static qboolean	initialized;

	if ( initialized ) {
		return;
	}
	initialized = qtrue;

	Cmd_AddCommand ("heartbeat", SV_Heartbeat_f);
	Cmd_AddCommand ("q3js_eventpost", SV_Q3JSEventPost_f);
	Cmd_AddCommand ("q3js_killpost", SV_Q3JSKillPost_f);
	Cmd_AddCommand ("kick", SV_Kick_f);
#ifndef STANDALONE
	if(!com_standalone->integer)
	{
		Cmd_AddCommand ("banUser", SV_Ban_f);
		Cmd_AddCommand ("banClient", SV_BanNum_f);
	}
#endif
	Cmd_AddCommand ("kickbots", SV_KickBots_f);
	Cmd_AddCommand ("kickall", SV_KickAll_f);
	Cmd_AddCommand ("kicknum", SV_KickNum_f);
	Cmd_AddCommand ("clientkick", SV_KickNum_f); // Legacy command
	Cmd_AddCommand ("status", SV_Status_f);
	Cmd_AddCommand ("serverinfo", SV_Serverinfo_f);
	Cmd_AddCommand ("systeminfo", SV_Systeminfo_f);
	Cmd_AddCommand ("dumpuser", SV_DumpUser_f);
	Cmd_AddCommand ("map_restart", SV_MapRestart_f);
	Cmd_AddCommand ("sectorlist", SV_SectorList_f);
	Cmd_AddCommand ("map", SV_Map_f);
	Cmd_SetCommandCompletionFunc( "map", SV_CompleteMapName );
#ifndef PRE_RELEASE_DEMO
	Cmd_AddCommand ("devmap", SV_Map_f);
	Cmd_SetCommandCompletionFunc( "devmap", SV_CompleteMapName );
	Cmd_AddCommand ("spmap", SV_Map_f);
	Cmd_SetCommandCompletionFunc( "spmap", SV_CompleteMapName );
	Cmd_AddCommand ("spdevmap", SV_Map_f);
	Cmd_SetCommandCompletionFunc( "spdevmap", SV_CompleteMapName );
#endif
	Cmd_AddCommand ("killserver", SV_KillServer_f);
	if( com_dedicated->integer ) {
		Cmd_AddCommand ("say", SV_ConSay_f);
		Cmd_AddCommand ("tell", SV_ConTell_f);
		Cmd_AddCommand ("sayto", SV_ConSayto_f);
		Cmd_SetCommandCompletionFunc( "sayto", SV_CompletePlayerName );
	}
	
	Cmd_AddCommand("rehashbans", SV_RehashBans_f);
	Cmd_AddCommand("listbans", SV_ListBans_f);
	Cmd_AddCommand("banaddr", SV_BanAddr_f);
	Cmd_AddCommand("exceptaddr", SV_ExceptAddr_f);
	Cmd_AddCommand("bandel", SV_BanDel_f);
	Cmd_AddCommand("exceptdel", SV_ExceptDel_f);
	Cmd_AddCommand("flushbans", SV_FlushBans_f);
}

/*
==================
SV_RemoveOperatorCommands
==================
*/
void SV_RemoveOperatorCommands( void ) {
#if 0
	// removing these won't let the server start again
	Cmd_RemoveCommand ("heartbeat");
	Cmd_RemoveCommand ("kick");
	Cmd_RemoveCommand ("kicknum");
	Cmd_RemoveCommand ("clientkick");
	Cmd_RemoveCommand ("kickall");
	Cmd_RemoveCommand ("kickbots");
	Cmd_RemoveCommand ("banUser");
	Cmd_RemoveCommand ("banClient");
	Cmd_RemoveCommand ("status");
	Cmd_RemoveCommand ("serverinfo");
	Cmd_RemoveCommand ("systeminfo");
	Cmd_RemoveCommand ("dumpuser");
	Cmd_RemoveCommand ("map_restart");
	Cmd_RemoveCommand ("sectorlist");
	Cmd_RemoveCommand ("say");
#endif
}
