# Emscripten specific settings

if(NOT EMSCRIPTEN)
    return()
endif()

set(CMAKE_EXECUTABLE_SUFFIX ".js")
set(CMAKE_SHARED_LIBRARY_SUFFIX ".wasm")

# Disable options that don't make sense for emscripten
set(BUILD_RENDERER_GL1 OFF CACHE INTERNAL "")
set(USE_RENDERER_DLOPEN OFF CACHE INTERNAL "")
set(USE_OPENAL OFF CACHE INTERNAL "")
set(USE_OPENAL_DLOPEN OFF CACHE INTERNAL "")
set(USE_MUMBLE OFF CACHE INTERNAL "")
set(BUILD_GAME_LIBRARIES OFF CACHE INTERNAL "")
set(USE_HTTP OFF CACHE INTERNAL "")

# Disable LTO since the libraries Emscripten provides aren't LTO enabled
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION FALSE)

list(APPEND CLIENT_LINK_OPTIONS
    -sTOTAL_MEMORY=256MB
    -sALLOW_MEMORY_GROWTH=1
    -sSTACK_SIZE=5242880
    -sGLOBAL_BASE=8388608
    -sMIN_WEBGL_VERSION=2
    -sMAX_WEBGL_VERSION=2
    -sFORCE_FILESYSTEM=1
    -sWASMFS=0
    -sENVIRONMENT=web
    -sEXPORTED_RUNTIME_METHODS=FS,addRunDependency,removeRunDependency,callMain
    -sEXIT_RUNTIME=1
    -sEXPORT_ES6
    -sEXPORT_NAME=${CLIENT_NAME}
    -lidbfs.js
    "SHELL:--pre-js ${SOURCE_DIR}/web/webtransport-framing.js"
    "SHELL:--pre-js ${SOURCE_DIR}/web/client-webtransport-pre.js"
)

list(APPEND SERVER_LINK_OPTIONS
    -sTOTAL_MEMORY=256MB
    -sSTACK_SIZE=5242880
    -sEXIT_RUNTIME=1
    -sENVIRONMENT=node
    -sNODERAWFS=1
    "SHELL:--pre-js ${SOURCE_DIR}/web/webtransport-framing.js"
    "SHELL:--pre-js ${SOURCE_DIR}/web/server-node-pre.js"
)

option(EMSCRIPTEN_PRELOAD_FILE "Preload game files into .data file" OFF)

if(EMSCRIPTEN_PRELOAD_FILE)
    if(NOT EXISTS "${CMAKE_SOURCE_DIR}/${BASEGAME}")
        message(FATAL_ERROR "No files in '${BASEGAME}' directory for emscripten to preload.")
    endif()
    list(APPEND CLIENT_LINK_OPTIONS --preload-file "${BASEGAME}")
endif()

list(APPEND POST_CONFIGURE_FUNCTIONS deploy_shell_files)

function(deploy_shell_files)
    if(TARGET ${CLIENT_NAME})
        set_property(TARGET ${CLIENT_NAME} APPEND PROPERTY LINK_DEPENDS
            ${SOURCE_DIR}/web/webtransport-framing.js
            ${SOURCE_DIR}/web/client-webtransport-pre.js)
    endif()
    if(TARGET ${SERVER_NAME})
        set_property(TARGET ${SERVER_NAME} APPEND PROPERTY LINK_DEPENDS
            ${SOURCE_DIR}/web/webtransport-framing.js
            ${SOURCE_DIR}/web/server-node-pre.js)
    endif()

    configure_file(${SOURCE_DIR}/web/client.html.in
        ${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}/${CLIENT_NAME}.html @ONLY)

    if(NOT EMSCRIPTEN_PRELOAD_FILE)
        configure_file(${SOURCE_DIR}/web/client-config.json
            ${CMAKE_BINARY_DIR}/${CMAKE_BUILD_TYPE}/${CLIENT_NAME}-config.json COPYONLY)
    endif()
endfunction()
