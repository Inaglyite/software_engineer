@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
REM =============================================
REM DHU Secondhand Books - Windows one-click script
REM Usage: run.bat init | start | backend | frontend | stop | status | seed | logs | restart
REM =============================================

SET PROJECT_DIR=%~dp0
SET VENV_DIR=%PROJECT_DIR%backend\.venv
SET LOG_DIR=%PROJECT_DIR%.logs
IF NOT EXIST %LOG_DIR% mkdir %LOG_DIR%

SET DB_USER=%DB_USER:=%
IF "%DB_USER%"=="" SET DB_USER=Inaglyite
SET DB_PASS=%DB_PASS:=%
IF "%DB_PASS%"=="" SET DB_PASS=H20041227j
SET DB_HOST=%DB_HOST:=%
IF "%DB_HOST%"=="" SET DB_HOST=127.0.0.1
SET DB_PORT=%DB_PORT:=%
IF "%DB_PORT%"=="" SET DB_PORT=3306
SET DB_NAME=%DB_NAME:=%
IF "%DB_NAME%"=="" SET DB_NAME=dhu_secondhand_platform

SET UVICORN_HOST=127.0.0.1
SET UVICORN_PORT=8000
SET BACKEND_PID_FILE=%PROJECT_DIR%backend.pid
SET FRONTEND_PID_FILE=%PROJECT_DIR%frontend.pid

IF "%1"=="" GOTO :help
IF "%1"=="restart" GOTO :restart
IF "%1"=="seed" GOTO :seed
IF "%1"=="logs" GOTO :logs

:ensureVenv
IF NOT EXIST %VENV_DIR% (
  echo [INFO] Creating Python virtual environment...
  python -m venv %VENV_DIR%
)
CALL "%VENV_DIR%\Scripts\activate.bat"
IF NOT EXIST %VENV_DIR%\installed.flag (
  echo [INFO] Installing backend dependencies...
  pip install --upgrade pip >NUL 2>&1
  pip install -r "%PROJECT_DIR%backend\requirements.txt" || GOTO :fail
  echo installed> %VENV_DIR%\installed.flag
)
GOTO :EOF

:startBackend
CALL :ensureVenv
SET UVICORN_CMD="%VENV_DIR%\Scripts\uvicorn.exe" backend.app.main:app --host %UVICORN_HOST% --port %UVICORN_PORT% --reload
ECHO [INFO] Starting backend: %UVICORN_CMD%
start "backend" %UVICORN_CMD%
ECHO %UVICORN_CMD% > %BACKEND_PID_FILE%
GOTO :EOF

:startFrontend
ECHO [INFO] Starting frontend dev server...
IF NOT EXIST "%PROJECT_DIR%node_modules" (
  echo [INFO] Installing frontend dependencies...
  cd /d "%PROJECT_DIR%"
  call npm install || GOTO :fail
)
cd /d "%PROJECT_DIR%"
start "frontend" npm run dev
ECHO npm run dev > %FRONTEND_PID_FILE%
GOTO :EOF

:stopAll
ECHO [INFO] Attempting to stop processes (manual close may be required on Windows GUI windows)...
REM Recommend user closes the started cmd windows; PID tracking for spawned windows is non-trivial cross-shell.
DEL /F /Q %BACKEND_PID_FILE% 2>NUL
DEL /F /Q %FRONTEND_PID_FILE% 2>NUL
GOTO :EOF

:status
ECHO ===== STATUS =====
TASKLIST /FI "IMAGENAME eq uvicorn.exe" | find /I "uvicorn" && echo Backend: running on http://%UVICORN_HOST%:%UVICORN_PORT% || echo Backend: not detected
TASKLIST /FI "IMAGENAME eq node.exe" | find /I "node" && echo Frontend: dev server may be running on http://localhost:5173 || echo Frontend: not detected
ECHO ==================
GOTO :EOF

:init
ECHO [INFO] Initializing project (backend venv + npm install)...
CALL :ensureVenv
IF NOT EXIST "%PROJECT_DIR%node_modules" (
  cd /d "%PROJECT_DIR%" && npm install || GOTO :fail
)
ECHO [INFO] Init done.
GOTO :EOF

:help
ECHO Usage: run.bat init ^| start ^| backend ^| frontend ^| stop ^| status ^| seed ^| logs ^| restart
ECHO   init       Create venv + install deps (backend & frontend)
ECHO   start      Start backend and frontend
ECHO   backend    Start backend only
ECHO   frontend   Start frontend only
ECHO   stop       Stop (remove pid markers; close windows manually if needed)
ECHO   status     Show running process hints
ECHO   seed       Run seed_data.py (ensure sample users/books)
ECHO   logs       Print log file hints
ECHO   restart    Restart backend (close uvicorn then start)
GOTO :EOF

:restart
CALL :stopBackend
CALL :startBackend
GOTO :status

:stopBackend
REM Try to terminate uvicorn window by task name
TASKLIST /FI "IMAGENAME eq uvicorn.exe" | find /I "uvicorn" >NUL && (
  echo [INFO] Attempting to terminate uvicorn processes...
  for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq uvicorn.exe" ^| find /I "uvicorn"') do taskkill /PID %%p /F >NUL 2>&1
)
GOTO :EOF

:seed
CALL :ensureVenv
IF EXIST scripts\seed_data.py (
  echo [INFO] Running seed_data.py ...
  python scripts\seed_data.py > .logs\seed.out 2>&1 && echo [INFO] Seed done. Log: .logs\seed.out || echo [ERROR] Seed failed. See .logs\seed.out
) ELSE (
  echo [WARN] scripts\seed_data.py not found.
)
GOTO :EOF

:logs
ECHO === Backend log (tail not available in CMD, show first lines) ===
IF EXIST .logs\backend.out type .logs\backend.out | more
ECHO === Frontend log ===
IF EXIST .logs\frontend.out type .logs\frontend.out | more
ECHO === Seed log ===
IF EXIST .logs\seed.out type .logs\seed.out | more
GOTO :EOF
