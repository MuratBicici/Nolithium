; "Open with" registration. Nolithium is offered for every file (like Notepad)
; and suggested for Markdown and text files, but never made the default app:
; nothing here changes which program a double-click opens.

!macro NOLITHIUM_SUGGEST EXT
  WriteRegStr SHCTX "Software\Classes\${EXT}\OpenWithProgids" "Nolithium.Document" ""
!macroend

!macro NOLITHIUM_UNSUGGEST EXT
  DeleteRegValue SHCTX "Software\Classes\${EXT}\OpenWithProgids" "Nolithium.Document"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe" "FriendlyAppName" "${PRODUCTNAME}"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  WriteRegStr SHCTX "Software\Classes\*\OpenWithList\${MAINBINARYNAME}.exe" "" ""

  WriteRegStr SHCTX "Software\Classes\Nolithium.Document" "" "Nolithium document"
  WriteRegStr SHCTX "Software\Classes\Nolithium.Document\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
  WriteRegStr SHCTX "Software\Classes\Nolithium.Document\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  !insertmacro NOLITHIUM_SUGGEST ".md"
  !insertmacro NOLITHIUM_SUGGEST ".markdown"
  !insertmacro NOLITHIUM_SUGGEST ".txt"

  ; Let Explorer pick up the new "Open with" entries without a sign-out.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; An update uninstalls the old version first; keep the entries in that case.
  ${If} $UpdateMode <> 1
    DeleteRegKey SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe"
    DeleteRegKey SHCTX "Software\Classes\*\OpenWithList\${MAINBINARYNAME}.exe"
    DeleteRegKey SHCTX "Software\Classes\Nolithium.Document"
    !insertmacro NOLITHIUM_UNSUGGEST ".md"
    !insertmacro NOLITHIUM_UNSUGGEST ".markdown"
    !insertmacro NOLITHIUM_UNSUGGEST ".txt"
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ${EndIf}
!macroend
