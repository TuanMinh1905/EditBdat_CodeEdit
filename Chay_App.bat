@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai dat thu vien lan dau, vui long cho...
  call npm install
)
start "" /b npm start
