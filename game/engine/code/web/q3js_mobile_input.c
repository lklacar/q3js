#include "../client/client.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif
#endif

static qboolean q3js_mobile_bindings_initialized = qfalse;

static void Q3JS_InitMobileBindings( void )
{
	if( q3js_mobile_bindings_initialized )
	{
		return;
	}

	q3js_mobile_bindings_initialized = qtrue;

	Key_SetBinding( K_JOY1, "+forward" );
	Key_SetBinding( K_JOY2, "+back" );
	Key_SetBinding( K_JOY3, "+moveleft" );
	Key_SetBinding( K_JOY4, "+moveright" );
	Key_SetBinding( K_JOY5, "+attack" );
	Key_SetBinding( K_JOY6, "+moveup" );
	Key_SetBinding( K_JOY7, "+movedown" );
	Key_SetBinding( K_JOY8, "weapnext" );
	Key_SetBinding( K_JOY9, "weapprev" );

	Cvar_Set( "cl_freelook", "1" );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileInitBindings( void )
{
	Q3JS_InitMobileBindings();
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileKeyEvent( int key, int down )
{
	Q3JS_InitMobileBindings();

	if( key < 0 || key >= MAX_KEYS )
	{
		return;
	}

	Com_QueueEvent( 0, SE_KEY, key, down ? qtrue : qfalse, 0, NULL );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileMouseMove( int dx, int dy )
{
	Q3JS_InitMobileBindings();

	if( dx == 0 && dy == 0 )
	{
		return;
	}

	Com_QueueEvent( 0, SE_MOUSE, dx, dy, 0, NULL );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileJoystickAxis( int axis, int value )
{
	Q3JS_InitMobileBindings();

	if( axis < 0 || axis >= MAX_JOYSTICK_AXIS )
	{
		return;
	}

	Com_QueueEvent( 0, SE_JOYSTICK_AXIS, axis, value, 0, NULL );
}
