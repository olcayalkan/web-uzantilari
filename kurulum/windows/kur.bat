@echo off
rem Windows kurulumu: secilen uzantilari son Release'ten %USERPROFILE%\WebUzantilari altina
rem indirir, secilen tarayicinin uzanti sayfasini ve klasoru acar. curl ve tar Windows 10
rem (1803) ile gelir. Kullanim: kur.bat [uzanti ... ^| hepsi] [--tarayici chrome^|brave^|edge^|firefox]
chcp 65001 >nul
setlocal EnableExtensions

if not defined KUR_KAYNAK set "KUR_KAYNAK=https://github.com/olcayalkan/web-uzantilari/releases/latest/download"
if not defined KUR_KLASOR set "KUR_KLASOR=%USERPROFILE%\WebUzantilari"
set "SECILEN="
set "ISTENEN="
set "HATA=0"
set "EK="
set "N=0"
set "SEC_ANAHTAR="
set "SEC_KOMUT="
set "SEC_SAYFA="

where curl >nul 2>nul || goto :aracyok
where tar >nul 2>nul || goto :aracyok

:argumanlar
if "%~1"=="" goto :argumanbitti
if /i "%~1"=="--tarayici" (
  set "ISTENEN=%~2"
  shift
  shift
  goto :argumanlar
)
call :ad %~1
shift
goto :argumanlar
:argumanbitti
if "%HATA%"=="2" goto :son
if defined SECILEN goto :tarayicilar

echo Hangi uzantılar kurulsun?
echo   1) oto-cozucu
echo   2) oto-cevirmen
echo   3) sola-itele
echo   4) voice-tamer
echo   5) hepsi
set "YANIT=5"
set /p "YANIT=Numara (boşlukla birden fazla, varsayılan hepsi): "
for %%n in (%YANIT%) do call :numara %%n
if "%HATA%"=="2" goto :son
if not defined SECILEN goto :son

:tarayicilar
call :ekle chrome chrome.exe chrome "chrome://extensions"
call :ekle brave brave.exe brave "brave://extensions"
call :ekle firefox firefox.exe firefox "about:debugging#/runtime/this-firefox"
call :ekle edge msedge.exe msedge "edge://extensions"

if defined ISTENEN goto :istenen
if "%N%"=="0" goto :indir
set "TSEC=1"
if "%N%"=="1" goto :tarayiciatama
echo Hangi tarayıcıya kurulsun?
for /l %%i in (1,1,%N%) do call echo   %%i) %%T%%i_ANAHTAR%%
set /p "TSEC=Numara (varsayılan 1): "
:tarayiciatama
call set "SEC_ANAHTAR=%%T%TSEC%_ANAHTAR%%"
call set "SEC_KOMUT=%%T%TSEC%_KOMUT%%"
call set "SEC_SAYFA=%%T%TSEC%_SAYFA%%"
if not defined SEC_ANAHTAR (
  set "TSEC=1"
  goto :tarayiciatama
)
goto :indir

:istenen
set "SEC_ANAHTAR=%ISTENEN%"
for /l %%i in (1,1,%N%) do call :eslestir %%i

:indir
if /i "%SEC_ANAHTAR%"=="firefox" (
  set "EK=-firefox"
  set "KUR_KLASOR=%KUR_KLASOR%\firefox"
)
rem Komutlara goreli ad verilir: Turkce harfli kullanici klasorunde curl ve tar UTF-8 yolu okuyamaz.
if not exist "%KUR_KLASOR%" mkdir "%KUR_KLASOR%"
cd /d "%KUR_KLASOR%" || goto :son
echo İndiriliyor: %CD%
for %%u in (%SECILEN%) do call :kur %%u
if not "%HATA%"=="0" goto :son

if defined SEC_KOMUT start "" %SEC_KOMUT% "%SEC_SAYFA%"
start "" "%CD%"
powershell -NoProfile -Command "Set-Clipboard -Value $env:KUR_KLASOR" >nul 2>nul

echo.
if defined SEC_KOMUT (echo %SEC_ANAHTAR% uzantı sayfası açıldı.) else (echo Tarayıcı bulunamadı. Uzantı sayfası elle açılır.)
if /i "%SEC_ANAHTAR%"=="firefox" goto :firefoxadimlari
echo Tarayıcı, mağaza dışındaki uzantıyı kendiliğinden yüklemez. Kalan adımlar:
echo   1. Geliştirici modu anahtarını aç.
echo   2. Her uzantı için Paketlenmemiş öğe yükle düğmesine bas ve klasörünü seç:
for %%u in (%SECILEN%) do echo      %CD%\%%u
echo   3. Açık sekmeleri yenile.
goto :son

:firefoxadimlari
echo Kalan adımlar:
echo   1. Geçici Eklenti Yükle düğmesine bas.
echo   2. Her uzantı için manifest.json dosyasını seç:
for %%u in (%SECILEN%) do echo      %CD%\%%u\manifest.json
echo   3. Açık sekmeleri yenile.
echo Firefox geçici eklentiyi kapanınca kaldırır. Kalıcı kurulum Mozilla imzası ister.
goto :son

:numara
if "%~1"=="1" (call :ad oto-cozucu& exit /b)
if "%~1"=="2" (call :ad oto-cevirmen& exit /b)
if "%~1"=="3" (call :ad sola-itele& exit /b)
if "%~1"=="4" (call :ad voice-tamer& exit /b)
if "%~1"=="5" (call :ad hepsi& exit /b)
call :ad %~1
exit /b

:ad
if /i "%~1"=="hepsi" (set "SECILEN=oto-cozucu oto-cevirmen sola-itele voice-tamer"& exit /b)
for %%u in (oto-cozucu oto-cevirmen sola-itele voice-tamer) do if /i "%~1"=="%%u" (set "SECILEN=%SECILEN% %%u"& exit /b)
echo Bilinmeyen uzantı: %~1
set "HATA=2"
exit /b

:ekle
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\%~2" >nul 2>nul && goto :eklevar
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\%~2" >nul 2>nul && goto :eklevar
exit /b
:eklevar
set /a N+=1
set "T%N%_ANAHTAR=%~1"
set "T%N%_KOMUT=%~3"
set "T%N%_SAYFA=%~4"
exit /b

:eslestir
call set "A=%%T%~1_ANAHTAR%%"
if /i not "%A%"=="%ISTENEN%" exit /b
call set "SEC_KOMUT=%%T%~1_KOMUT%%"
call set "SEC_SAYFA=%%T%~1_SAYFA%%"
exit /b

rem Yeni surum once yan klasore iner: indirme bozulursa calisan kurulum silinmez.
rem Klasor adi ayni kalir, cunku Chromium uzanti kimligini ve ayarlari yola baglar.
:kur
set "AD=%~1"
curl -fsSL -o "%AD%.zip" "%KUR_KAYNAK%/%AD%%EK%.zip"
if errorlevel 1 goto :kurhata
if exist "%AD%.yeni" rmdir /s /q "%AD%.yeni"
mkdir "%AD%.yeni"
tar -xf "%AD%.zip" -C "%AD%.yeni"
if errorlevel 1 goto :kurhata
if not exist "%AD%.yeni\manifest.json" goto :kurhata
if exist "%AD%" rmdir /s /q "%AD%"
ren "%AD%.yeni" "%AD%"
del "%AD%.zip"
echo   %AD%
exit /b

:kurhata
echo Kurulamadı: %AD% (%KUR_KAYNAK%/%AD%%EK%.zip)
if exist "%AD%.zip" del "%AD%.zip"
if exist "%AD%.yeni" rmdir /s /q "%AD%.yeni"
set "HATA=1"
exit /b

:aracyok
echo Bu dosya curl ve tar gerektirir (Windows 10 sürüm 1803 ve sonrası).
set "HATA=1"

:son
echo.
pause
exit /b %HATA%
