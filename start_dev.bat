@echo off
echo Starting MySQL for Proof of Build (port 3307)...

:: Check if MySQL is already running on 3307
netstat -aon | findstr "3307" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo MySQL is already running on port 3307.
    goto :start_app
)

:: Start MySQL with the project's data directory
set CONFIG_PATH=%~dp0my_pob.ini
echo Starting MySQL with config: %CONFIG_PATH%
start "" /B "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="%CONFIG_PATH%"

:: Wait for MySQL to be ready
echo Waiting for MySQL to start...
timeout /t 5 /nobreak >nul

:check_mysql
netstat -aon | findstr "3307" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting...
    timeout /t 2 /nobreak >nul
    goto :check_mysql
)
echo MySQL is ready on port 3307!

:start_app
echo Starting dev server...
npm run dev:server
