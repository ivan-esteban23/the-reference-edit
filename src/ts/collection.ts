// Personal sources are independent of the curated records and their favorites.
interface Folder{id: string; name: string; directory: string[]; personal: string[]}
(()=>{
 const key='reference-edit-personal-sources-v1',fields={name:120,url:2048,description:1000,category:80,country:80,tags:200,image:2048};
 const words={
 en:['My sources','Add source','Your own references, stored in this browser. They stay separate from the curated directory.','Search my sources','Favorites only','Name','Website URL','Short description','Optional details','Category','Country','Tags (comma separated)','Image URL','External images need internet and are not saved for offline use.','Cancel','Save source','Edit source','Delete','Delete this source?','Favorite','Favorited','No personal sources yet. Add your first reference.','No personal sources match.','Use an http:// or https:// URL.','Could not save. Your collection has not changed. Check browser storage and retry.','Your saved collection could not be read. Existing browser data has not been changed.','This website is already in My sources.','shown'],
 es:['Mis fuentes','Añadir fuente','Tus referencias, guardadas en este navegador y separadas del directorio seleccionado.','Buscar en mis fuentes','Solo favoritas','Nombre','URL del sitio','Descripción breve','Detalles opcionales','Categoría','País','Etiquetas (separadas por comas)','URL de imagen','Las imágenes externas necesitan internet y no se guardan sin conexión.','Cancelar','Guardar fuente','Editar fuente','Eliminar','¿Eliminar esta fuente?','Favorita','En favoritas','Aún no hay fuentes personales. Añade tu primera referencia.','Ninguna fuente personal coincide.','Usa una URL http:// o https://.','No se pudo guardar. Tu colección no ha cambiado. Comprueba el almacenamiento y reintenta.','No se pudo leer tu colección. Los datos existentes no se han modificado.','Este sitio ya está en Mis fuentes.','visibles'],
 'zh-Hans':['我的来源','添加来源','你的参考资料保存在此浏览器中，与精选目录分开。','搜索我的来源','仅收藏','名称','网站网址','简短描述','可选信息','类别','国家','标签（用逗号分隔）','图片网址','外部图片需要联网，不会离线保存。','取消','保存来源','编辑来源','删除','删除此来源？','收藏','已收藏','还没有个人来源。添加第一条参考资料。','没有匹配的个人来源。','请使用 http:// 或 https:// 网址。','无法保存。收藏集未更改。请检查浏览器存储后重试。','无法读取收藏集。现有浏览器数据未更改。','此网站已在我的来源中。','显示'],
 'zh-Hant':['我的來源','新增來源','你的參考資料儲存在此瀏覽器中，與精選目錄分開。','搜尋我的來源','僅收藏','名稱','網站網址','簡短描述','選填資訊','類別','國家','標籤（以逗號分隔）','圖片網址','外部圖片需要連線，不會離線儲存。','取消','儲存來源','編輯來源','刪除','刪除此來源？','收藏','已收藏','尚無個人來源。新增第一筆參考資料。','沒有符合的個人來源。','請使用 http:// 或 https:// 網址。','無法儲存。收藏集未更改。請檢查瀏覽器儲存空間後重試。','無法讀取收藏集。現有瀏覽器資料未更改。','此網站已在我的來源中。','顯示'],
 ja:['自分の情報源','情報源を追加','自分の参考資料をこのブラウザに保存します。既存のディレクトリとは別に管理されます。','自分の情報源を検索','お気に入りのみ','名前','サイトのURL','短い説明','任意の項目','カテゴリー','国','タグ（カンマ区切り）','画像URL','外部画像には通信が必要です。オフライン用には保存されません。','キャンセル','情報源を保存','情報源を編集','削除','この情報源を削除しますか？','お気に入り','登録済み','まだ情報源がありません。最初の参考資料を追加してください。','一致する情報源がありません。','http:// または https:// のURLを使用してください。','保存できませんでした。コレクションは変更されていません。ストレージを確認して再試行してください。','コレクションを読み込めませんでした。既存のデータは変更されていません。','このサイトはすでに登録されています。','表示'],
 ko:['내 소스','소스 추가','내 참고 자료는 이 브라우저에 저장되며 기존 디렉터리와 별도로 관리됩니다.','내 소스 검색','즐겨찾기만','이름','웹사이트 URL','짧은 설명','선택 정보','카테고리','국가','태그 (쉼표로 구분)','이미지 URL','외부 이미지는 인터넷이 필요하며 오프라인용으로 저장되지 않습니다.','취소','소스 저장','소스 편집','삭제','이 소스를 삭제할까요?','즐겨찾기','저장됨','개인 소스가 없습니다. 첫 참고 자료를 추가하세요.','일치하는 개인 소스가 없습니다.','http:// 또는 https:// URL을 사용하세요.','저장하지 못했습니다. 컬렉션은 변경되지 않았습니다. 브라우저 저장소를 확인하고 다시 시도하세요.','컬렉션을 읽지 못했습니다. 기존 브라우저 데이터는 변경되지 않았습니다.','이미 내 소스에 있는 웹사이트입니다.','표시']
 };
 const names=['title','add','intro','search','only','name','url','description','optional','category','country','tags','image','imageNote','cancel','save','edit','delete','remove','favorite','saved','empty','noMatches','invalid','failure','corrupt','duplicate','shown'];

 const collectionWords={"en": ["My collection", "Saved directory entries and sources you add, together in this browser.", "Search collection", "Your collection is empty. Save a directory source or add your own.", "No sources match this collection view.", "Back to directory", "Show sources", "All", "From directory", "Added by me", "Remove from collection", "Directory favorites could not be read or saved. Existing browser data has not been changed. Check browser storage and retry."], "es": ["Mi colección", "Favoritas del directorio y fuentes que añades, juntas en este navegador.", "Buscar en la colección", "Tu colección está vacía. Guarda una fuente del directorio o añade una propia.", "Ninguna fuente coincide con esta vista.", "Volver al directorio", "Mostrar fuentes", "Todas", "Del directorio", "Añadidas por mí", "Quitar de la colección", "No se pudieron guardar las favoritas del directorio. Tu selección no ha cambiado. Comprueba el almacenamiento y reintenta."], "zh-Hans": ["我的收藏集", "目录收藏和你添加的来源，一起保存在此浏览器中。", "搜索收藏集", "收藏集为空。收藏目录来源或添加自己的来源。", "此视图没有匹配的来源。", "返回目录", "显示来源", "全部", "来自目录", "我添加的", "从收藏集中移除", "无法保存目录收藏。已保存的选择未更改。请检查浏览器存储后重试。"], "zh-Hant": ["我的收藏集", "目錄收藏與你新增的來源，一起儲存在此瀏覽器中。", "搜尋收藏集", "收藏集是空的。收藏目錄來源或新增自己的來源。", "此檢視沒有符合的來源。", "返回目錄", "顯示來源", "全部", "來自目錄", "我新增的", "從收藏集中移除", "無法儲存目錄收藏。已儲存的選擇未更改。請檢查瀏覽器儲存空間後重試。"], "ja": ["マイコレクション", "ディレクトリのお気に入りと追加した情報源を、このブラウザでまとめて管理します。", "コレクションを検索", "コレクションは空です。ディレクトリから保存するか、自分の情報源を追加してください。", "この表示に一致する情報源はありません。", "ディレクトリに戻る", "情報源を表示", "すべて", "ディレクトリから", "自分で追加", "コレクションから削除", "ディレクトリのお気に入りを保存できませんでした。保存済みの選択は変更されていません。ストレージを確認して再試行してください。"], "ko": ["내 컬렉션", "디렉터리 즐겨찾기와 직접 추가한 소스를 이 브라우저에서 함께 관리합니다.", "컬렉션 검색", "컬렉션이 비어 있습니다. 디렉터리 소스를 저장하거나 직접 추가하세요.", "이 보기에 일치하는 소스가 없습니다.", "디렉터리로 돌아가기", "소스 표시", "전체", "디렉터리에서", "내가 추가함", "컬렉션에서 제거", "디렉터리 즐겨찾기를 저장하지 못했습니다. 저장된 선택은 변경되지 않았습니다. 저장소를 확인하고 다시 시도하세요."]};
 const collectionNames=["title", "intro", "search", "empty", "noMatches", "back", "kind", "all", "directory", "personal", "removeSaved", "directoryFailure"];
 for(const locale of Object.keys(words)){for(let i=0;i<collectionNames.length;i++){const name=collectionNames[i];if(names.includes(name))words[locale][names.indexOf(name)]=collectionWords[locale][i];else words[locale].push(collectionWords[locale][i]);}}
 names.push(...collectionNames.filter(name=>!names.includes(name)));
 const directoryLabels={"en": "View in directory", "es": "Ver en el directorio", "zh-Hans": "在目录中查看", "zh-Hant": "在目錄中檢視", "ja": "ディレクトリで見る", "ko": "디렉터리에서 보기"};
 for(const locale of Object.keys(words))words[locale].push(directoryLabels[locale]);names.push('viewDirectory');
 const noteWords={"en": ["Add note", "Edit note", "Your note (up to 2,000 characters)", "Notes stay in your browser and collection backups, even if you remove the saved source. Clear the text and save to remove a note.", "Save note", "Could not save the note. Your draft is still here. Check browser storage and retry.", "Your saved notes could not be read. Existing browser data has not been changed.", "This note changed in another tab. Copy your draft, then reopen the note before saving.", "Notes to add: {notesAdded}; existing notes kept: {notesSkipped}.", "Notes added: {notesAdded}; existing notes kept: {notesSkipped}.", "Your note", "Notes for unsaved sources are retained. Save those sources again to see their notes."], "es": ["Añadir nota", "Editar nota", "Tu nota (hasta 2.000 caracteres)", "Las notas permanecen en el navegador y las copias de la colección, aunque quites la fuente guardada. Borra el texto y guarda para eliminar una nota.", "Guardar nota", "No se pudo guardar la nota. Tu borrador sigue aquí. Comprueba el almacenamiento y reintenta.", "No se pudieron leer tus notas. Los datos existentes no se han modificado.", "Esta nota cambió en otra pestaña. Copia tu borrador y vuelve a abrir la nota antes de guardar.", "Notas por añadir: {notesAdded}; notas existentes conservadas: {notesSkipped}.", "Notas añadidas: {notesAdded}; notas existentes conservadas: {notesSkipped}.", "Tu nota", "Se conservan las notas de fuentes no guardadas. Vuelve a guardar esas fuentes para ver sus notas."], "zh-Hans": ["添加笔记", "编辑笔记", "你的笔记（最多 2,000 字符）", "即使移除收藏来源，笔记也会保留在浏览器和收藏集备份中。清空文字并保存即可删除笔记。", "保存笔记", "无法保存笔记。草稿仍在此处。请检查浏览器存储后重试。", "无法读取已保存的笔记。现有浏览器数据未更改。", "此笔记已在其他标签页更改。请复制草稿，重新打开笔记后再保存。", "待添加笔记：{notesAdded}；保留现有笔记：{notesSkipped}。", "已添加笔记：{notesAdded}；保留现有笔记：{notesSkipped}。", "你的笔记", "未收藏来源的笔记仍会保留。重新收藏这些来源即可查看笔记。"], "zh-Hant": ["新增筆記", "編輯筆記", "你的筆記（最多 2,000 字元）", "即使移除收藏來源，筆記也會保留在瀏覽器與收藏集備份中。清空文字並儲存即可刪除筆記。", "儲存筆記", "無法儲存筆記。草稿仍在此處。請檢查瀏覽器儲存空間後重試。", "無法讀取已儲存的筆記。現有瀏覽器資料未更改。", "此筆記已在其他分頁更改。請複製草稿，重新開啟筆記後再儲存。", "待新增筆記：{notesAdded}；保留現有筆記：{notesSkipped}。", "已新增筆記：{notesAdded}；保留現有筆記：{notesSkipped}。", "你的筆記", "未收藏來源的筆記仍會保留。重新收藏這些來源即可查看筆記。"], "ja": ["メモを追加", "メモを編集", "メモ（最大2,000文字）", "保存した情報源を削除しても、メモはブラウザとコレクションのバックアップに残ります。メモを削除するには、本文を空にして保存してください。", "メモを保存", "メモを保存できませんでした。下書きは残っています。ストレージを確認して再試行してください。", "保存したメモを読み込めませんでした。既存のデータは変更されていません。", "このメモは別のタブで変更されました。下書きをコピーし、メモを開き直してから保存してください。", "追加予定のメモ：{notesAdded}件、保持する既存メモ：{notesSkipped}件。", "追加したメモ：{notesAdded}件、保持した既存メモ：{notesSkipped}件。", "自分のメモ", "保存を解除した情報源のメモも残ります。情報源を再び保存するとメモが表示されます。"], "ko": ["메모 추가", "메모 편집", "내 메모 (최대 2,000자)", "저장한 소스를 제거해도 메모는 브라우저와 컬렉션 백업에 남습니다. 메모를 지우려면 내용을 비우고 저장하세요.", "메모 저장", "메모를 저장하지 못했습니다. 초안은 그대로 있습니다. 저장소를 확인하고 다시 시도하세요.", "저장한 메모를 읽지 못했습니다. 기존 브라우저 데이터는 변경되지 않았습니다.", "다른 탭에서 이 메모가 변경되었습니다. 초안을 복사하고 메모를 다시 연 후 저장하세요.", "추가할 메모: {notesAdded}개, 유지할 기존 메모: {notesSkipped}개.", "추가한 메모: {notesAdded}개, 유지한 기존 메모: {notesSkipped}개.", "내 메모", "저장을 해제한 소스의 메모도 보관됩니다. 해당 소스를 다시 저장하면 메모를 볼 수 있습니다."]};
 const noteNames=["addNote", "editNote", "noteLabel", "noteHint", "saveNote", "noteFailure", "noteCorrupt", "noteConflict", "previewNotes", "importedNotes", "yourNote", "retainedNotes"];
 for(const locale of Object.keys(words))words[locale].push(...noteWords[locale]);names.push(...noteNames);
 const recentWords={"en": ["Recently viewed", "Sources you opened, kept in this browser.", "Clear list"], "es": ["Vistas recientemente", "Fuentes que abriste, guardadas en este navegador.", "Borrar lista"], "zh-Hans": ["最近查看", "你打开过的来源，保存在此浏览器中。", "清除列表"], "zh-Hant": ["最近檢視", "你開啟過的來源，儲存在此瀏覽器中。", "清除清單"], "ja": ["最近閲覧した情報源", "開いた情報源を、このブラウザに保存します。", "リストを消去"], "ko": ["최근 본 소스", "연 소스를 이 브라우저에 보관합니다.", "목록 지우기"]};
 const recentNames=["recent","recentHint","recentClear"];
 for(const locale of Object.keys(words))words[locale].push(...recentWords[locale]);names.push(...recentNames);
 const folderWords={"en": ["Folders", "New folder", "Filter by folder", "All folders", "Unfiled", "Folder", "No folder", "Rename", "Delete folder", "Delete this folder? Sources stay in your collection without a folder.", "Folder name", "Save folder", "Rename folder", "No folders yet. Create one to group saved sources.", "{n} saved sources", "Could not save folder changes. Your collection has not changed. Check browser storage and retry.", "Saved folders could not be read. Existing browser data has not been changed.", "A folder with this name already exists.", "Folders organize saved sources in this browser. Deleting a folder never deletes sources. Folder changes are included in collection backups."], "es": ["Carpetas", "Nueva carpeta", "Filtrar por carpeta", "Todas las carpetas", "Sin clasificar", "Carpeta", "Sin carpeta", "Renombrar", "Eliminar carpeta", "¿Eliminar esta carpeta? Las fuentes permanecerán en tu colección sin carpeta.", "Nombre de la carpeta", "Guardar carpeta", "Renombrar carpeta", "Aún no hay carpetas. Crea una para agrupar fuentes guardadas.", "{n} fuentes guardadas", "No se pudieron guardar los cambios de carpetas. Tu colección no ha cambiado. Comprueba el almacenamiento y reintenta.", "No se pudieron leer las carpetas guardadas. Los datos existentes no se han modificado.", "Ya existe una carpeta con este nombre.", "Las carpetas organizan las fuentes guardadas en este navegador. Eliminar una carpeta nunca elimina fuentes. Los cambios de carpetas se incluyen en las copias de la colección."], "zh-Hans": ["文件夹", "新建文件夹", "按文件夹筛选", "所有文件夹", "未归档", "文件夹", "不放入文件夹", "重命名", "删除文件夹", "删除此文件夹？来源会留在收藏集中，只是不再归档。", "文件夹名称", "保存文件夹", "重命名文件夹", "还没有文件夹。创建一个来整理已保存的来源。", "{n} 个已保存来源", "无法保存文件夹更改。收藏集未更改。请检查浏览器存储后重试。", "无法读取已保存的文件夹。现有浏览器数据未更改。", "已存在同名文件夹。", "文件夹用于整理此浏览器中保存的来源。删除文件夹不会删除来源。文件夹更改会包含在收藏集备份中。"], "zh-Hant": ["資料夾", "新增資料夾", "依資料夾篩選", "所有資料夾", "未歸檔", "資料夾", "不放入資料夾", "重新命名", "刪除資料夾", "刪除此資料夾？來源會留在收藏集中，只是不再歸檔。", "資料夾名稱", "儲存資料夾", "重新命名資料夾", "尚無資料夾。建立一個來整理已儲存的來源。", "{n} 個已儲存來源", "無法儲存資料夾變更。收藏集未更改。請檢查瀏覽器儲存空間後重試。", "無法讀取已儲存的資料夾。現有瀏覽器資料未更改。", "已存在同名資料夾。", "資料夾用來整理此瀏覽器中儲存的來源。刪除資料夾不會刪除來源。資料夾變更會包含在收藏集備份中。"], "ja": ["フォルダ", "新しいフォルダ", "フォルダで絞り込む", "すべてのフォルダ", "未整理", "フォルダ", "フォルダなし", "名前を変更", "フォルダを削除", "このフォルダを削除しますか？情報源はフォルダなしでコレクションに残ります。", "フォルダ名", "フォルダを保存", "フォルダ名を変更", "フォルダはまだありません。作成して保存した情報源を整理できます。", "保存済み {n} 件", "フォルダの変更を保存できませんでした。コレクションは変更されていません。ストレージを確認して再試行してください。", "保存したフォルダを読み込めませんでした。既存のデータは変更されていません。", "同じ名前のフォルダがすでにあります。", "フォルダはこのブラウザに保存した情報源を整理します。フォルダを削除しても情報源は削除されません。フォルダの変更はコレクションのバックアップに含まれます。"], "ko": ["폴더", "새 폴더", "폴더로 필터", "모든 폴더", "미분류", "폴더", "폴더 없음", "이름 바꾸기", "폴더 삭제", "이 폴더를 삭제할까요? 소스는 폴더 없이 컬렉션에 남습니다.", "폴더 이름", "폴더 저장", "폴더 이름 바꾸기", "폴더가 없습니다. 만들어 저장한 소스를 정리하세요.", "저장된 소스 {n}개", "폴더 변경을 저장하지 못했습니다. 컬렉션은 변경되지 않았습니다. 저장소를 확인하고 다시 시도하세요.", "저장한 폴더를 읽지 못했습니다. 기존 브라우저 데이터는 변경되지 않았습니다.", "같은 이름의 폴더가 이미 있습니다.", "폴더는 이 브라우저에 저장한 소스를 정리합니다. 폴더를 삭제해도 소스는 삭제되지 않습니다. 폴더 변경은 컬렉션 백업에 포함됩니다."]};
 const folderNames=["folders","newFolder","folderFilter","allFolders","unfiled","folder","noFolder","rename","deleteFolder","deleteFolderQuestion","folderName","saveFolder","renameFolder","foldersEmpty","folderCount","folderFailure","folderCorrupt","folderDuplicate","foldersHint"];
 for(const locale of Object.keys(words))words[locale].push(...folderWords[locale]);names.push(...folderNames);
 const label=name=>(words[document.documentElement.lang]||words.en)[names.indexOf(name)];
 const $=<T extends HTMLElement=HTMLElement>(id:string):T=>document.getElementById(id) as T,dialog=$<HTMLDialogElement>('personal-dialog'),form=$<HTMLFormElement>('personal-form'),list=$<HTMLDivElement>('personal-list'),warning=$<HTMLParagraphElement>('personal-warning');
 const formField=(name:string)=>form.elements.namedItem(name) as HTMLInputElement|HTMLTextAreaElement;
 const notesKey='reference-edit-directory-notes-v1';let directoryNotes=new Map(),editingNote=null,noteOriginal='';
 const foldersKey='reference-edit-collection-folders-v1',folderNameLimit=60,folderImportLimit=200;
 let sources=[],only=false,kind='all',editing=null,deleting=null;
 let folders=[],folderFilter='all',folderEditing=null,deletingFolder=null;
 function webURL(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol))throw Error('URL');return url.href;}
 function valid(source){
  if(!source||typeof source.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(source.id)||typeof source.favorite!=='boolean')return false;
  for(const [name,max] of Object.entries(fields))if(typeof source[name]!=='string'||source[name].length>max)return false;
  if(!source.name.trim()||!source.description.trim())return false;
  try{webURL(source.url);if(source.image)webURL(source.image);}catch(error){return false;}return true;
 }
 function read(){
  const raw=localStorage.getItem(key);if(raw===null)return [];
  const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.sources)||!data.sources.every(valid)||new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('Collection');
  return data.sources;
 }
 function validNote(note){return !!note&&typeof note.url==='string'&&note.url.length<=2048&&typeof note.text==='string'&&note.text.length<=2000&&!!note.text.trim()&&(()=>{try{webURL(note.url);return true;}catch(error){return false;}})();}
 function readNotes(){
  const raw=localStorage.getItem(notesKey);if(raw===null)return new Map();const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.notes)||!data.notes.every(validNote))throw Error('Notes');
  const notes=new Map(data.notes.map(note=>[webURL(note.url),note.text]));if(notes.size!==data.notes.length)throw Error('Notes');return notes;
 }
 const noteRecords=notes=>[...notes].map(([url,text])=>({url,text}));
 function refreshNotes(){try{directoryNotes=readNotes();$<HTMLParagraphElement>('directory-notes-warning').hidden=true;}catch(error){$<HTMLParagraphElement>('directory-notes-warning').textContent=label('noteCorrupt');$<HTMLParagraphElement>('directory-notes-warning').hidden=false;}}
 function notice(code){warning.dataset.message=code;warning.textContent=label(code);warning.hidden=false;}
 function commit(change){
  try{
   const next=change(read());localStorage.setItem(key,JSON.stringify({version:1,sources:next}));sources=next;warning.hidden=true;render();return true;
  }catch(error){notice(error.message==='duplicate'?'duplicate':'failure');return false;}
 }
 // Folders organize saved sources locally; deleting a folder never deletes sources.
 function validFolder(folder){
  if(!folder||typeof folder.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(folder.id)||typeof folder.name!=='string'||!folder.name.trim()||folder.name.length>folderNameLimit)return false;
  if(!Array.isArray(folder.directory)||!folder.directory.every(url=>typeof url==='string'&&url.length<=2048&&(()=>{try{webURL(url);return true;}catch(error){return false;}})())||new Set(folder.directory).size!==folder.directory.length)return false;
  if(!Array.isArray(folder.personal)||!folder.personal.every(id=>typeof id==='string'&&/^[-a-zA-Z0-9]{1,80}$/.test(id))||new Set(folder.personal).size!==folder.personal.length)return false;
  return true;
 }
 function validFolders(list){
  if(!Array.isArray(list)||!list.every(validFolder))return false;
  const names=new Set(),directory=new Set(),personal=new Set();
  for(const folder of list){
   const name=folder.name.toLocaleLowerCase();if(names.has(name))return false;names.add(name);
   for(const url of folder.directory){if(directory.has(url))return false;directory.add(url);}
   for(const id of folder.personal){if(personal.has(id))return false;personal.add(id);}
  }
  return true;
 }
 function readFolders(){
  const raw=localStorage.getItem(foldersKey);if(raw===null)return[];
  const data=JSON.parse(raw);
  if(data?.version!==1||!validFolders(data.folders))throw Error('Folders');
  return data.folders;
 }
 function folderNotice(code){const el=$<HTMLParagraphElement>('folder-warning');el.dataset.message=code;el.textContent=label(code);el.hidden=false;}
 function refreshFolders(){try{folders=readFolders();$<HTMLParagraphElement>('folder-warning').hidden=true;}catch(error){folders=[];folderNotice('folderCorrupt');}}
 function commitFolders(change){
  try{
   const next=change(readFolders());if(!validFolders(next))throw Error('Folders');
   localStorage.setItem(foldersKey,JSON.stringify({version:1,folders:next}));folders=next;$<HTMLParagraphElement>('folder-warning').hidden=true;render();return true;
  }catch(error){folderNotice('folderFailure');return false;}
 }
 function folderCount(folder){
  const saved=new Set([...favoriteKeys].map(webURL)),ids=new Set(sources.map(source=>source.id));
  return folder.directory.filter(url=>saved.has(url)).length+folder.personal.filter(id=>ids.has(id)).length;
 }
 const folderOfDirectory=url=>folders.find(folder=>folder.directory.includes(url))?.id||'';
 const folderOfPersonal=id=>folders.find(folder=>folder.personal.includes(id))?.id||'';
 const matchesFolder=id=>folderFilter==='all'||(folderFilter==='none'?!id:id===folderFilter);
 function moveMember(type,value,folderId){
  return commitFolders(latest=>latest.map(folder=>({...folder,directory:type==='directory'?folder.directory.filter(url=>url!==value):folder.directory,personal:type==='personal'?folder.personal.filter(id=>id!==value):folder.personal})).map(folder=>folder.id===folderId?{...folder,directory:type==='directory'?[...folder.directory,value]:folder.directory,personal:type==='personal'?[...folder.personal,value]:folder.personal}:folder));
 }
 function focusFolder(id,actionName){const row=([...$<HTMLDivElement>('folder-list').children] as HTMLElement[]).find(row=>row.dataset.folderId===id);(row?.querySelector<HTMLButtonElement>(`[data-folder-action="${actionName}"]`)||$<HTMLButtonElement>('folder-add')).focus({preventScroll:true});}
 function focusMember(type,value){
  const card=([...list.children] as HTMLElement[]).find(child=>type==='directory'?child.dataset.directoryUrl===value:child.dataset.personalId===value);
  (card?.querySelector<HTMLSelectElement>('.folder-select')||list.querySelector<HTMLSelectElement>('.folder-select')||$<HTMLButtonElement>('personal-add')).focus({preventScroll:true});
 }
 function folderError(code){const el=$<HTMLParagraphElement>('folder-error');if(code){el.dataset.message=code;el.textContent=label(code);}else{delete el.dataset.message;el.textContent='';}}
 function folderDeleteError(code){const el=$<HTMLParagraphElement>('folder-delete-error');if(code){el.dataset.message=code;el.textContent=label(code);}else{delete el.dataset.message;el.textContent='';}}
 function openFolder(folder){
  folderEditing=folder?.id||null;$<HTMLHeadingElement>('folder-dialog-title').textContent=label(folderEditing?'renameFolder':'newFolder');
  $<HTMLInputElement>('folder-name').value=folder?.name||'';folderError('');$<HTMLDialogElement>('folder-dialog').showModal();$<HTMLInputElement>('folder-name').focus();
 }
 function element<T extends keyof HTMLElementTagNameMap>(tag:T,text?:string,className?:string):HTMLElementTagNameMap[T]{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function action(text,handler){const button=element('button',text);button.type='button';button.addEventListener('click',handler);return button;}
 function focusCard(id,actionName){const card=([...list.children] as HTMLElement[]).find(c=>c.dataset.personalId===id);(card?.querySelector<HTMLButtonElement>(`[data-personal-action="${actionName}"]`)||$<HTMLButtonElement>('personal-add')).focus({preventScroll:true});}
 function render(){
  if(folderFilter!=='all'&&folderFilter!=='none'&&!folders.some(folder=>folder.id===folderFilter))folderFilter='all';
  const q=$<HTMLInputElement>('personal-search').value.trim().toLocaleLowerCase();
  const selected=cards.filter(c=>favoriteKeys.has(c.querySelector<HTMLButtonElement>('.favorite-source').dataset.url));
  const directory=kind==='personal'?[]:selected.filter(c=>matchesFolder(folderOfDirectory(webURL(c.querySelector<HTMLButtonElement>('.favorite-source').dataset.url)))&&(c.textContent+' '+(directoryNotes.get(webURL(c.querySelector<HTMLButtonElement>('.favorite-source').dataset.url))||'')).toLocaleLowerCase().includes(q));
  const visible=sources.filter(s=>kind!=='directory'&&(!only||s.favorite)&&matchesFolder(folderOfPersonal(s.id))&&[s.name,s.url,s.description,s.category,s.country,s.tags].join(' ').toLocaleLowerCase().includes(q));
  const total=selected.length+sources.length;
  $('my-sources').classList.toggle('is-empty',!total);
  $<HTMLSpanElement>('collection-count').textContent=String(total);$<HTMLSpanElement>('mobile-saved-count').textContent=String(total);
  $<HTMLParagraphElement>('collection-storage-warning').hidden=storageAvailable;
  const savedURLs=new Set([...favoriteKeys].map(webURL));$<HTMLParagraphElement>('directory-notes-retained').hidden=![...directoryNotes.keys()].some(url=>!savedURLs.has(url));
  document.querySelectorAll<HTMLButtonElement>('[data-collection-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.collectionKind===kind)));

  $<HTMLDivElement>('personal-tools').hidden=!total;$<HTMLButtonElement>('personal-only').setAttribute('aria-pressed',String(only));
  $<HTMLDivElement>('collection-folder-filter').hidden=!folders.length;
  const option=(value,text)=>{const el=element('option',text);el.value=value;return el;};
  if(folders.length){
   const filter=$<HTMLSelectElement>('folder-filter');
   filter.replaceChildren(option('all',label('allFolders')),option('none',label('unfiled')),...folders.map(folder=>option(folder.id,`${folder.name} (${folderCount(folder)})`)));
   filter.value=folderFilter;
  }
  const folderList=$<HTMLDivElement>('folder-list');folderList.replaceChildren();
  if(!folders.length)folderList.append(element('p',label('foldersEmpty'),'personal-note'));
  for(const folder of folders){
   const row=element('div',undefined,'folder-row');row.dataset.folderId=folder.id;
   const info=element('div',undefined,'folder-info');
   info.append(element('p',folder.name,'folder-name'),element('p',label('folderCount').replace('{n}',String(folderCount(folder))),'personal-meta'));
   const actions=element('div',undefined,'personal-actions');
   const rename=action(label('rename'),()=>openFolder(folder));
   rename.dataset.folderAction='rename';rename.setAttribute('aria-label',label('rename')+': '+folder.name);
   const remove=action(label('deleteFolder'),()=>{deletingFolder=folder.id;$<HTMLParagraphElement>('folder-delete-name').textContent=folder.name;folderDeleteError('');$<HTMLDialogElement>('folder-delete-dialog').showModal();$<HTMLButtonElement>('folder-delete-cancel').focus();});
   remove.dataset.folderAction='delete';remove.setAttribute('aria-label',label('deleteFolder')+': '+folder.name);
   actions.append(rename,remove);row.append(info,actions);folderList.append(row);
  }
  $<HTMLParagraphElement>('personal-status').textContent=total?`${directory.length+visible.length} / ${total} ${label('shown')}`:label('empty');
  $<HTMLButtonElement>('personal-export').disabled=!total&&!directoryNotes.size;$<HTMLButtonElement>('collection-export-directory').disabled=!selected.length;
  list.replaceChildren();
  if(total&&!visible.length&&!directory.length)list.append(element('p',label('noMatches')));
  for(const original of directory){
   const url=original.querySelector<HTMLButtonElement>('.favorite-source').dataset.url;
   const card=element('article',undefined,'collection-source');card.dataset.directoryUrl=url;
   card.append(element('p',label('directory'),'collection-origin'));
   const originalLink=original.querySelector<HTMLAnchorElement>('h3 a'),heading=element('h3'),link=element('a',originalLink.textContent.replace('↗','').trim());
   link.href=originalLink.href;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
   card.append(heading,element('p',original.querySelector<HTMLParagraphElement>('.source-purpose').textContent.trim()),element('p',[t(original.dataset.category),t(original.dataset.country),t(accessByCard.get(original))].join(' · '),'personal-meta'));
   const text=directoryNotes.get(webURL(url));if(text)card.append(element('p',label('yourNote'),'personal-meta'),element('p',text,'directory-note-text'));
   if(folders.length){
    const field=element('label',label('folder'),'folder-field');
    const select=element('select');select.className='folder-select';
    select.append(option('',label('noFolder')),...folders.map(folder=>option(folder.id,folder.name)));
    select.value=folderOfDirectory(webURL(url));
    select.setAttribute('aria-label',label('folder')+': '+link.textContent);
    select.addEventListener('change',()=>{const previous=folderOfDirectory(webURL(url));if(!moveMember('directory',webURL(url),select.value))select.value=previous;else focusMember('directory',url);});
    field.append(select);card.append(field);
   }
   const actions=element('div',undefined,'personal-actions');
   const remove=action(label('removeSaved'),()=>{
    original.querySelector<HTMLButtonElement>('.favorite-source').click();
    const next=[...list.querySelectorAll<HTMLElement>('[data-directory-url]')].find(c=>c.dataset.directoryUrl===url)?.querySelector<HTMLButtonElement>('button')||list.querySelector<HTMLButtonElement>('button')||$<HTMLHeadingElement>('personal-title');
    next.setAttribute('tabindex',next.matches('button')?'0':'-1');next.focus({preventScroll:true});
   });
   remove.dataset.collectionAction='remove';remove.setAttribute('aria-label',label('removeSaved')+': '+link.textContent);
   const details=action(label('viewDirectory'),()=>openDirectory(original));
   details.dataset.collectionAction='details';details.setAttribute('aria-label',label('viewDirectory')+': '+link.textContent);
   const note=action(label(text?'editNote':'addNote'),()=>openNote(url,link.textContent));note.dataset.collectionAction='note';note.setAttribute('aria-label',label(text?'editNote':'addNote')+': '+link.textContent);
   actions.append(details,note,remove);card.append(actions);list.append(card);
  }
  for(const source of visible){
   const card=element('article',undefined,'personal-source');card.dataset.personalId=source.id;card.append(element('p',label('personal'),'collection-origin'));
   if(source.image){const image=element('img');image.src=source.image;image.alt='';image.width=64;image.height=64;image.loading='lazy';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove(),{once:true});card.append(image);}
   const heading=element('h3'),link=element('a',source.name);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);card.append(heading,element('p',source.description));
   if(source.category||source.country)card.append(element('p',[source.category,source.country].filter(Boolean).join(' · '),'personal-meta'));
   if(source.tags)card.append(element('p',source.tags,'personal-meta'));
   if(folders.length){
    const field=element('label',label('folder'),'folder-field');
    const select=element('select');select.className='folder-select';
    select.append(option('',label('noFolder')),...folders.map(folder=>option(folder.id,folder.name)));
    select.value=folderOfPersonal(source.id);
    select.setAttribute('aria-label',label('folder')+': '+source.name);
    select.addEventListener('change',()=>{const previous=folderOfPersonal(source.id);if(!moveMember('personal',source.id,select.value))select.value=previous;else focusMember('personal',source.id);});
    field.append(select);card.append(field);
   }
   const actions=element('div',undefined,'personal-actions');
   const favorite=action(label(source.favorite?'saved':'favorite'),()=>{if(commit(latest=>latest.map(s=>s.id===source.id?{...s,favorite:!s.favorite}:s)))focusCard(source.id,'favorite');});
   favorite.dataset.personalAction='favorite';favorite.setAttribute('aria-pressed',String(source.favorite));favorite.setAttribute('aria-label',label('favorite')+': '+source.name);
   const edit=action(label('edit'),()=>open(source));edit.dataset.personalAction='edit';edit.setAttribute('aria-label',label('edit')+': '+source.name);
   const remove=action(label('delete'),()=>{deleting=source.id;$<HTMLParagraphElement>('personal-delete-name').textContent=source.name;$<HTMLParagraphElement>('personal-delete-error').textContent='';$<HTMLDialogElement>('personal-delete-dialog').showModal();$<HTMLButtonElement>('personal-delete-cancel').focus();});
   remove.dataset.personalAction='delete';remove.setAttribute('aria-label',label('delete')+': '+source.name);actions.append(favorite,edit,remove);card.append(actions);list.append(card);
  }
  renderRecent();
 }
 function localize(){
  document.querySelectorAll<HTMLElement>('[data-personal-label]').forEach(el=>el.textContent=label(el.dataset.personalLabel));
  $<HTMLHeadingElement>('personal-dialog-title').textContent=label(editing?'edit':'add');
  $<HTMLHeadingElement>('directory-note-title').textContent=label(noteOriginal?'editNote':'addNote');
  if($<HTMLParagraphElement>('directory-note-error').dataset.message)$<HTMLParagraphElement>('directory-note-error').textContent=label($<HTMLParagraphElement>('directory-note-error').dataset.message);
  $<HTMLHeadingElement>('folder-dialog-title').textContent=label(folderEditing?'renameFolder':'newFolder');
  if($<HTMLParagraphElement>('folder-error').dataset.message)$<HTMLParagraphElement>('folder-error').textContent=label($<HTMLParagraphElement>('folder-error').dataset.message);
  if($<HTMLParagraphElement>('folder-delete-error').dataset.message)$<HTMLParagraphElement>('folder-delete-error').textContent=label($<HTMLParagraphElement>('folder-delete-error').dataset.message);
  if(!$<HTMLParagraphElement>('folder-warning').hidden)$<HTMLParagraphElement>('folder-warning').textContent=label($<HTMLParagraphElement>('folder-warning').dataset.message);
  if(!$<HTMLParagraphElement>('directory-notes-warning').hidden)$<HTMLParagraphElement>('directory-notes-warning').textContent=label('noteCorrupt');
  if(!warning.hidden)warning.textContent=label(warning.dataset.message);
  render();
 }
 // Recently viewed is a local convenience history of curated sources, not saved content.
 const recentKey='reference-edit-recently-viewed-v1',recentLimit=8;let recent=[];
 const cardByURL=new Map(cards.map(card=>[webURL(card.querySelector<HTMLButtonElement>('.favorite-source').dataset.url),card]));
 function readRecent(){
  const raw=localStorage.getItem(recentKey);if(raw===null)return[];
  const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.items)||!data.items.every(item=>typeof item==='string'&&item.length<=2048))throw Error('Recent');
  const items=data.items.map(webURL);if(new Set(items).size!==items.length)throw Error('Recent');return items.slice(0,recentLimit);
 }
 function refreshRecent(){try{recent=readRecent();}catch(error){recent=[];}renderRecent();}
 function recordRecent(href){
  let url;try{url=webURL(href);}catch(error){return;}
  let next;try{next=[url,...readRecent().filter(item=>item!==url&&cardByURL.has(item))].slice(0,recentLimit);}catch(error){next=[url];}
  try{localStorage.setItem(recentKey,JSON.stringify({version:1,items:next}));recent=next;queueMicrotask(renderRecent);}catch(error){}
 }
 function openDirectory(card: HTMLElement){
  category='All';topic='';region.value='All';accessFilter.value='All';countryFilter.value='All';search.value='';favoritesOnly=false;
  navigateDirectory(false);card.scrollIntoView({block:'start',behavior:'instant'});card.querySelector<HTMLAnchorElement>('h3 a').focus({preventScroll:true});
 }
 function renderRecent(){
  const section=$('recently-viewed'),container=$<HTMLDivElement>('recently-viewed-list');
  const active=document.activeElement,activeLink=active&&section.contains(active)?active.closest('h3 a'):null;
  const entries=recent.filter(url=>cardByURL.has(url));
  section.hidden=!entries.length;container.replaceChildren();
  for(const url of entries){
   const card=cardByURL.get(url),source=card.querySelector<HTMLAnchorElement>('h3 a');
   const item=element('article',undefined,'recent-source'),heading=element('h3'),link=element('a',source.textContent.replace('↗','').trim());
   link.href=source.href;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
   item.append(heading,element('p',[t(card.dataset.category),t(card.dataset.country),t(accessByCard.get(card))].join(' · '),'personal-meta'));
   const actions=element('div',undefined,'personal-actions');
   const details=action(label('viewDirectory'),()=>openDirectory(card));
   details.dataset.recentAction='details';details.setAttribute('aria-label',label('viewDirectory')+': '+link.textContent);
   actions.append(details);item.append(actions);container.append(item);
  }
  if(activeLink){const restore=[...container.querySelectorAll<HTMLAnchorElement>('h3 a')].find(link=>link.getAttribute('href')===activeLink.getAttribute('href'));if(restore)restore.focus({preventScroll:true});}
  if(section.hidden&&section.contains(document.activeElement))$<HTMLHeadingElement>('personal-title').focus({preventScroll:true});
 }
 function open(source){
  if(!collectionOpen)navigateDirectory(true);
  editing=source?.id||null;form.reset();$<HTMLParagraphElement>('personal-error').textContent='';
  for(const name of Object.keys(fields)){const input=formField(name);input.value=source?.[name]||'';input.setCustomValidity('');}
  form.querySelector<HTMLDetailsElement>('details').open=!!source&&['category','country','tags','image'].some(name=>source[name]);
  $<HTMLHeadingElement>('personal-dialog-title').textContent=label(editing?'edit':'add');
  $<HTMLHeadingElement>('directory-note-title').textContent=label(noteOriginal?'editNote':'addNote');
  if($<HTMLParagraphElement>('directory-note-error').dataset.message)$<HTMLParagraphElement>('directory-note-error').textContent=label($<HTMLParagraphElement>('directory-note-error').dataset.message);
  if(!$<HTMLParagraphElement>('directory-notes-warning').hidden)$<HTMLParagraphElement>('directory-notes-warning').textContent=label('noteCorrupt');dialog.showModal();$<HTMLInputElement>('personal-name').focus();
 }
 $<HTMLButtonElement>('personal-add').addEventListener('click',()=>open(null));
 $<HTMLButtonElement>('personal-cancel').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(editing)focusCard(editing,'edit');else $<HTMLButtonElement>('personal-add').focus({preventScroll:true});});
 form.addEventListener('input',event=>{(event.target as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement).setCustomValidity?.('');$<HTMLParagraphElement>('personal-error').textContent='';});
 form.addEventListener('submit',event=>{
  event.preventDefault();const values:Record<string,string>={};for(const name of Object.keys(fields))values[name]=formField(name).value.trim();
  for(const name of ['name','description'])if(!values[name]){const input=formField(name);input.value='';input.reportValidity();return;}
  for(const name of ['url','image'])if(values[name])try{values[name]=webURL(values[name]);}catch(error){const input=formField(name);input.setCustomValidity(label('invalid'));form.querySelector<HTMLDetailsElement>('details').open=true;input.reportValidity();return;}
  const id=editing||crypto.randomUUID();
  const saved=commit(latest=>{
   if(latest.some(s=>s.url===values.url&&s.id!==id))throw Error('duplicate');
   const previous=latest.find(s=>s.id===id);if(editing&&!previous)throw Error('Missing source');
   const source={...values,id,favorite:previous?.favorite||false};if(!valid(source))throw Error('Invalid source');
   return editing?latest.map(s=>s.id===id?source:s):[...latest,source];
  });
  if(saved){if(!editing){only=false;kind='all';$<HTMLInputElement>('personal-search').value='';render();}dialog.close();focusCard(id,'edit');}else $<HTMLParagraphElement>('personal-error').textContent=warning.textContent;
 });
 const noteDialog=$<HTMLDialogElement>('directory-note-dialog'),noteInput=$<HTMLTextAreaElement>('directory-note-input'),noteError=$<HTMLParagraphElement>('directory-note-error');
 function noteErrorMessage(code){noteError.dataset.message=code;noteError.textContent=label(code);}
 function openNote(url,name){
  editingNote=webURL(url);noteOriginal=directoryNotes.get(editingNote)||'';
  try{noteOriginal=readNotes().get(editingNote)||'';}catch(error){}
  noteInput.value=noteOriginal;noteError.textContent='';delete noteError.dataset.message;
  $<HTMLHeadingElement>('directory-note-title').textContent=label(noteOriginal?'editNote':'addNote');$<HTMLParagraphElement>('directory-note-source').textContent=name;noteDialog.showModal();noteInput.focus();
 }
 $<HTMLButtonElement>('directory-note-cancel').addEventListener('click',()=>noteDialog.close());
 noteDialog.addEventListener('close',()=>{
  if(noteDialog.open)return;const card=([...list.children] as HTMLElement[]).find(card=>card.dataset.directoryUrl&&webURL(card.dataset.directoryUrl)===editingNote);
  (card?.querySelector<HTMLButtonElement>('[data-collection-action=note]')||$<HTMLHeadingElement>('personal-title')).focus({preventScroll:true});
 });
 noteInput.addEventListener('input',()=>{noteError.textContent='';delete noteError.dataset.message;});
 $<HTMLFormElement>('directory-note-form').addEventListener('submit',event=>{
  event.preventDefault();const text=noteInput.value.trim();if(text.length>2000){noteInput.reportValidity();return;}
  try{
   const latest=readNotes();if((latest.get(editingNote)||'')!==noteOriginal){noteErrorMessage('noteConflict');return;}
   if(text)latest.set(editingNote,text);else latest.delete(editingNote);
   localStorage.setItem(notesKey,JSON.stringify({version:1,notes:noteRecords(latest)}));directoryNotes=latest;$<HTMLParagraphElement>('directory-notes-warning').hidden=true;
   render();noteDialog.close();
  }catch(error){noteErrorMessage('noteFailure');}
 });
 window.addEventListener('storage',event=>{if(event.key===notesKey||event.key===null){refreshNotes();render();}});
 $<HTMLHeadingElement>('personal-title').setAttribute('tabindex','-1');
 document.querySelectorAll<HTMLButtonElement>('[data-collection-kind]').forEach(button=>button.addEventListener('click',()=>{kind=button.dataset.collectionKind;render();}));
 window.addEventListener('visual-edit:favoriteschange',render);
 $<HTMLInputElement>('personal-search').addEventListener('input',render);
 $<HTMLSelectElement>('folder-filter').addEventListener('change',()=>{folderFilter=$<HTMLSelectElement>('folder-filter').value;render();});
 $<HTMLButtonElement>('personal-only').addEventListener('click',()=>{only=!only;render();});
 document.addEventListener('click',event=>{const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('article.source h3 a,.chooser-card h3 a,.collection-source h3 a,.recent-source h3 a'):null;if(link)recordRecent(link.href);});
 window.addEventListener('storage',event=>{if(event.key===recentKey||event.key===null)refreshRecent();});
 $<HTMLButtonElement>('recently-viewed-clear').addEventListener('click',()=>{try{localStorage.removeItem(recentKey);}catch(error){}recent=[];renderRecent();$<HTMLHeadingElement>('personal-title').focus({preventScroll:true});});
 $<HTMLButtonElement>('personal-delete-cancel').addEventListener('click',()=>$<HTMLDialogElement>('personal-delete-dialog').close());
 $<HTMLDialogElement>('personal-delete-dialog').addEventListener('close',()=>focusCard(deleting,'delete'));
 $<HTMLButtonElement>('personal-delete-confirm').addEventListener('click',()=>{
  if(commit(latest=>latest.filter(s=>s.id!==deleting))){$<HTMLDialogElement>('personal-delete-dialog').close();$<HTMLButtonElement>('personal-add').focus({preventScroll:true});}
  else $<HTMLParagraphElement>('personal-delete-error').textContent=warning.textContent;
 });
 $<HTMLButtonElement>('folder-add').addEventListener('click',()=>openFolder(null));
 $<HTMLButtonElement>('folder-cancel').addEventListener('click',()=>$<HTMLDialogElement>('folder-dialog').close());
 $<HTMLDialogElement>('folder-dialog').addEventListener('close',()=>{const id=folderEditing;folderEditing=null;if(id)focusFolder(id,'rename');else $<HTMLButtonElement>('folder-add').focus({preventScroll:true});});
 $<HTMLInputElement>('folder-name').addEventListener('input',()=>folderError(''));
 $<HTMLFormElement>('folder-form').addEventListener('submit',event=>{
  event.preventDefault();const input=$<HTMLInputElement>('folder-name'),name=input.value.trim();
  if(!name){input.value='';input.reportValidity();return;}
  let latest;try{latest=readFolders();}catch(error){latest=folders;}
  if(latest.some(folder=>folder.id!==folderEditing&&folder.name.toLocaleLowerCase()===name.toLocaleLowerCase())){folderError('folderDuplicate');return;}
  const saved=folderEditing?commitFolders(latest=>latest.map(folder=>folder.id===folderEditing?{...folder,name}:folder)):commitFolders(latest=>[...latest,{id:crypto.randomUUID(),name,directory:[],personal:[]}]);
  if(saved)$<HTMLDialogElement>('folder-dialog').close();else $<HTMLParagraphElement>('folder-error').textContent=$<HTMLParagraphElement>('folder-warning').textContent;
 });
 $<HTMLButtonElement>('folder-delete-cancel').addEventListener('click',()=>$<HTMLDialogElement>('folder-delete-dialog').close());
 $<HTMLDialogElement>('folder-delete-dialog').addEventListener('close',()=>focusFolder(deletingFolder,'delete'));
 $<HTMLButtonElement>('folder-delete-confirm').addEventListener('click',()=>{
  if(commitFolders(latest=>latest.filter(folder=>folder.id!==deletingFolder))){$<HTMLDialogElement>('folder-delete-dialog').close();$<HTMLButtonElement>('folder-add').focus({preventScroll:true});}
  else $<HTMLParagraphElement>('folder-delete-error').textContent=$<HTMLParagraphElement>('folder-warning').textContent;
 });
 window.addEventListener('storage',event=>{if(event.key===foldersKey||event.key===null){refreshFolders();render();}});
 function reload(){refreshNotes();refreshRecent();refreshFolders();try{sources=read();warning.hidden=true;}catch(error){notice('corrupt');}localize();}
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)reload();});
 const backupWords={
  en:['Backup and restore','Export backup (.json)','Import backup','Choose a JSON backup (up to 5 MB)','Export all My sources, including favorites. Import adds new URLs and keeps existing sources unchanged.','{added} new sources; {skipped} duplicate URLs will be skipped.','Imported {added} sources; skipped {skipped} duplicate URLs.','Choose a valid My sources JSON backup (up to 5 MB). Nothing was imported.'],
  es:['Copia y restauración','Exportar copia (.json)','Importar copia','Elige una copia JSON (hasta 5 MB)','Exporta todas Mis fuentes, incluidas las favoritas. La importación añade URL nuevas y conserva las fuentes existentes.','{added} fuentes nuevas; se omitirán {skipped} URL duplicadas.','Se importaron {added} fuentes y se omitieron {skipped} URL duplicadas.','Elige una copia JSON válida de Mis fuentes (hasta 5 MB). No se importó nada.'],
  'zh-Hans':['备份与恢复','导出备份 (.json)','导入备份','选择 JSON 备份（最大 5 MB）','导出所有个人来源及收藏。导入仅添加新网址，保留现有来源。','将添加 {added} 个来源，跳过 {skipped} 个重复网址。','已导入 {added} 个来源，跳过 {skipped} 个重复网址。','请选择有效的个人来源 JSON 备份（最大 5 MB）。未导入任何内容。'],
  'zh-Hant':['備份與還原','匯出備份 (.json)','匯入備份','選擇 JSON 備份（最大 5 MB）','匯出所有個人來源及收藏。匯入僅新增網址，保留現有來源。','將新增 {added} 個來源，略過 {skipped} 個重複網址。','已匯入 {added} 個來源，略過 {skipped} 個重複網址。','請選擇有效的個人來源 JSON 備份（最大 5 MB）。未匯入任何內容。'],
  ja:['バックアップと復元','バックアップを書き出す (.json)','バックアップを読み込む','JSON バックアップを選択（最大 5 MB）','お気に入りを含むすべての情報源を書き出します。読み込み時は新しいURLのみ追加し、既存の情報源は変更しません。','新規 {added} 件、重複URL {skipped} 件はスキップされます。','{added} 件を読み込み、重複URL {skipped} 件をスキップしました。','有効な情報源のJSONバックアップを選択してください（最大5 MB）。何も読み込まれていません。'],
  ko:['백업 및 복원','백업 내보내기 (.json)','백업 가져오기','JSON 백업 선택 (최대 5 MB)','즐겨찾기를 포함한 모든 내 소스를 내보냅니다. 가져오기는 새 URL만 추가하며 기존 소스는 유지합니다.','새 소스 {added}개를 추가하고 중복 URL {skipped}개를 건너뜁니다.','소스 {added}개를 가져왔으며 중복 URL {skipped}개를 건너뛰었습니다.','유효한 내 소스 JSON 백업을 선택하세요 (최대 5 MB). 아무것도 가져오지 않았습니다.']
 };
 const backupNames=['backup','export','import','file','backupHint','preview','imported','invalidBackup'];
 for(const locale of Object.keys(words))words[locale].push(...backupWords[locale]);names.push(...backupNames);

 const exportLabels={"en": ["Backup and restore", "Export collection (.json)", "Import collection", "Back up directory favorites and all added sources in one JSON file. Import adds missing items and keeps existing records unchanged. Older added-source backups are also accepted.", "Export directory favorites (.md)", "Choose a collection or older added-source JSON backup (up to 5 MB). Nothing was imported.", "{directoryAdded} directory favorites and {added} added sources to add; {skipped} duplicates skipped; {unavailable} directory URLs unavailable.", "Imported {directoryAdded} directory favorites and {added} added sources; skipped {skipped} duplicates and {unavailable} unavailable directory URLs.", "Import is incomplete. Your existing records are safe. Check browser storage and retry to finish.", "Folders to add: {foldersAdded}; sources to place in folders: {membersAdded}.", "Folders added: {foldersAdded}; sources placed in folders: {membersAdded}."], "es": ["Copia y restauración", "Exportar colección (.json)", "Importar colección", "Copia las favoritas del directorio y todas las fuentes añadidas en un JSON. Importar añade elementos nuevos y conserva los registros existentes. También acepta copias anteriores de fuentes añadidas.", "Exportar favoritas del directorio (.md)", "Elige una copia JSON de la colección o una copia anterior de fuentes añadidas (hasta 5 MB). No se importó nada.", "Se añadirán {directoryAdded} favoritas del directorio y {added} fuentes; se omiten {skipped} duplicados y {unavailable} URL no disponibles.", "Se importaron {directoryAdded} favoritas del directorio y {added} fuentes; se omitieron {skipped} duplicados y {unavailable} URL no disponibles.", "La importación está incompleta. Tus registros existentes están a salvo. Comprueba el almacenamiento y reintenta para terminar.", "Carpetas por añadir: {foldersAdded}; fuentes por archivar: {membersAdded}.", "Carpetas añadidas: {foldersAdded}; fuentes archivadas: {membersAdded}."], "zh-Hans": ["备份与恢复", "导出收藏集 (.json)", "导入收藏集", "将目录收藏和所有添加的来源备份到一个 JSON 文件。导入仅添加缺少的项目，保留现有记录。也支持旧版个人来源备份。", "导出目录收藏 (.md)", "请选择收藏集或旧版个人来源 JSON 备份（最大 5 MB）。未导入任何内容。", "将添加 {directoryAdded} 个目录收藏和 {added} 个个人来源；跳过 {skipped} 个重复项目和 {unavailable} 个不可用目录网址。", "已导入 {directoryAdded} 个目录收藏和 {added} 个个人来源；跳过 {skipped} 个重复项目和 {unavailable} 个不可用目录网址。", "导入尚未完成。现有记录是安全的。请检查浏览器存储后重试以完成导入。", "待添加文件夹：{foldersAdded}；待归档来源：{membersAdded}。", "已添加文件夹：{foldersAdded}；已归档来源：{membersAdded}。"], "zh-Hant": ["備份與還原", "匯出收藏集 (.json)", "匯入收藏集", "將目錄收藏與所有新增的來源備份到一個 JSON 檔案。匯入僅新增缺少的項目，保留現有紀錄。也支援舊版個人來源備份。", "匯出目錄收藏 (.md)", "請選擇收藏集或舊版個人來源 JSON 備份（最大 5 MB）。未匯入任何內容。", "將新增 {directoryAdded} 個目錄收藏與 {added} 個個人來源；略過 {skipped} 個重複項目與 {unavailable} 個無法使用的目錄網址。", "已匯入 {directoryAdded} 個目錄收藏與 {added} 個個人來源；略過 {skipped} 個重複項目與 {unavailable} 個無法使用的目錄網址。", "匯入尚未完成。現有紀錄是安全的。請檢查瀏覽器儲存空間後重試以完成匯入。", "待新增資料夾：{foldersAdded}；待歸檔來源：{membersAdded}。", "已新增資料夾：{foldersAdded}；已歸檔來源：{membersAdded}。"], "ja": ["バックアップと復元", "コレクションを書き出す (.json)", "コレクションを読み込む", "ディレクトリのお気に入りと追加したすべての情報源を1つのJSONに保存します。読み込みは不足項目のみ追加し、既存の情報は変更しません。以前の情報源バックアップにも対応しています。", "ディレクトリのお気に入りを書き出す (.md)", "コレクションまたは以前の情報源のJSONバックアップを選んでください（最大5 MB）。何も読み込まれていません。", "ディレクトリのお気に入り {directoryAdded} 件、追加情報源 {added} 件を追加予定。重複 {skipped} 件と利用できないURL {unavailable} 件をスキップします。", "ディレクトリのお気に入り {directoryAdded} 件と追加情報源 {added} 件を読み込みました。重複 {skipped} 件と利用できないURL {unavailable} 件をスキップしました。", "読み込みは未完了です。既存の情報は保護されています。ストレージを確認し、再試行して完了してください。", "追加予定のフォルダ：{foldersAdded}件、フォルダに入れる情報源：{membersAdded}件。", "追加したフォルダ：{foldersAdded}件、フォルダに入れた情報源：{membersAdded}件。"], "ko": ["백업 및 복원", "컬렉션 내보내기 (.json)", "컬렉션 가져오기", "디렉터리 즐겨찾기와 추가한 모든 소스를 하나의 JSON에 백업합니다. 가져오기는 없는 항목만 추가하며 기존 기록은 유지합니다. 이전 내 소스 백업도 지원합니다.", "디렉터리 즐겨찾기 내보내기 (.md)", "컬렉션 또는 이전 내 소스 JSON 백업을 선택하세요 (최대 5 MB). 아무것도 가져오지 않았습니다.", "디렉터리 즐겨찾기 {directoryAdded}개와 추가 소스 {added}개를 추가합니다. 중복 {skipped}개와 사용할 수 없는 URL {unavailable}개를 건너뜁니다.", "디렉터리 즐겨찾기 {directoryAdded}개와 소스 {added}개를 가져왔습니다. 중복 {skipped}개와 사용할 수 없는 URL {unavailable}개를 건너뛰었습니다.", "가져오기가 완료되지 않았습니다. 기존 기록은 안전합니다. 저장소를 확인하고 다시 시도해 완료하세요.", "추가할 폴더: {foldersAdded}개, 폴더에 넣을 소스: {membersAdded}개.", "추가한 폴더: {foldersAdded}개, 폴더에 넣은 소스: {membersAdded}개."]};
 const exportNames=["backup", "export", "import", "backupHint", "exportDirectory", "invalidBackup", "preview", "imported", "partialImport", "previewFolders", "importedFolders"];
 for(const locale of Object.keys(words)){for(const [i,name] of exportNames.entries()){const index=names.indexOf(name);if(index<0)words[locale].push(exportLabels[locale][i]);else words[locale][index]=exportLabels[locale][i];}}names.push(...exportNames.filter(name=>!names.includes(name)));
 const notesBackupHints={"en": "Back up directory favorites, their notes, folders and all added sources in one JSON file. Import adds missing items and keeps existing records, notes and folders unchanged. Older backups are also accepted.", "es": "Copia las favoritas del directorio, sus notas, las carpetas y todas las fuentes añadidas en un JSON. Importar añade elementos nuevos y conserva los registros, notas y carpetas existentes. También acepta copias anteriores.", "zh-Hans": "将目录收藏、笔记、文件夹和所有添加的来源备份到一个 JSON 文件。导入仅添加缺少的项目，保留现有记录、笔记和文件夹。也支持旧版备份。", "zh-Hant": "將目錄收藏、筆記、資料夾與所有新增的來源備份到一個 JSON 檔案。匯入僅新增缺少的項目，保留現有紀錄、筆記與資料夾。也支援舊版備份。", "ja": "ディレクトリのお気に入り、メモ、フォルダ、追加したすべての情報源を1つのJSONに保存します。読み込みは不足項目のみ追加し、既存の情報やメモ、フォルダは変更しません。以前のバックアップにも対応しています。", "ko": "디렉터리 즐겨찾기, 메모, 폴더와 추가한 모든 소스를 하나의 JSON에 백업합니다. 가져오기는 없는 항목만 추가하며 기존 기록, 메모, 폴더는 유지합니다. 이전 백업도 지원합니다."};
 for(const locale of Object.keys(words))words[locale][names.indexOf('backupHint')]=notesBackupHints[locale];
 const importDialog=$<HTMLDialogElement>('personal-import-dialog'),fileInput=$<HTMLInputElement>('personal-import-file'),importConfirm=$<HTMLButtonElement>('personal-import-confirm');
 let pendingImport=null,fileSelection=0,lastImport=null;
 const formatCounts=(message,counts)=>{const fill=text=>text.replace(/\{(added|skipped|directoryAdded|unavailable|notesAdded|notesSkipped|foldersAdded|membersAdded)\}/g,(_,name)=>counts[name]);return fill(label(message))+((counts.notesAdded||counts.notesSkipped)?' '+fill(label(message==='preview'?'previewNotes':'importedNotes')):'')+((counts.foldersAdded||counts.membersAdded)?' '+fill(label(message==='preview'?'previewFolders':'importedFolders')):'');};
 function mergeBackup(latest,incoming){
  const urls=new Set(latest.map(s=>webURL(s.url))),next=[...latest];let skipped=0;const idMap=new Map();
  for(const source of incoming){
   if(urls.has(source.url)){const existing=latest.find(s=>webURL(s.url)===source.url);idMap.set(source.id,existing?.id||source.id);skipped++;continue;}
   urls.add(source.url);const id=crypto.randomUUID();next.push({...source,id});idMap.set(source.id,id);
  }
  return {next,added:next.length-latest.length,skipped,idMap};
 }
 function mergeFolders(latest,incoming,idMap,favorites,personalIds){
  const next=latest.map(folder=>({...folder,directory:[...folder.directory],personal:[...folder.personal]}));
  const byName=new Map<string,Folder>(next.map(folder=>[folder.name.toLocaleLowerCase(),folder]));
  const filed=value=>next.some(folder=>folder.directory.includes(value)||folder.personal.includes(value));
  let foldersAdded=0,membersAdded=0;
  for(const folder of incoming){
   const name=folder.name.trim();let target=byName.get(name.toLocaleLowerCase());
   if(!target){target={id:crypto.randomUUID(),name,directory:[],personal:[]};next.push(target);byName.set(name.toLocaleLowerCase(),target);foldersAdded++;}
   for(const url of folder.directory)if(favorites.has(url)&&!filed(url)){target.directory.push(url);membersAdded++;}
   for(const id of folder.personal){const match=idMap.get(id);if(match&&personalIds.has(match)&&!filed(match)){target.personal.push(match);membersAdded++;}}
  }
  return {next,foldersAdded,membersAdded};
 }
 // Plan against current storage both for preview and again at confirmation.
 function planImport(incoming){
  const personal=mergeBackup(read(),incoming.sources),favorites=readFavorites();
  const known=new Map(cards.map(card=>{const url=card.querySelector<HTMLButtonElement>('.favorite-source').dataset.url;return [webURL(url),url];}));
  const seen=new Set([...favorites].map(webURL));let directoryAdded=0,unavailable=0,skipped=personal.skipped;
  for(const url of incoming.directoryFavorites){
   if(seen.has(url)){skipped++;continue;}seen.add(url);
   const match=known.get(url);if(!match){unavailable++;continue;}
   favorites.add(match);directoryAdded++;
  }
  const notes=readNotes();let notesAdded=0,notesSkipped=0;
  for(const note of incoming.directoryNotes){if(notes.has(note.url)){notesSkipped++;continue;}notes.set(note.url,note.text);notesAdded++;}
  const merged=mergeFolders(readFolders(),incoming.folders,personal.idMap,new Set([...favorites].map(webURL)),new Set(personal.next.map(source=>source.id)));
  return {...personal,favorites:[...favorites],directoryAdded,unavailable,skipped,notes,notesAdded,notesSkipped,folders:merged.next,foldersAdded:merged.foldersAdded,membersAdded:merged.membersAdded};
 }
 function previewImport(){
  if(!pendingImport)return;
  try{$<HTMLParagraphElement>('personal-import-preview').textContent=formatCounts('preview',planImport(pendingImport));}
  catch(error){$<HTMLParagraphElement>('personal-import-error').textContent=label('failure');importConfirm.disabled=true;}
 }
 function commitImport(incoming){
  let counts;
  try{counts=planImport(incoming);}catch(error){notice('failure');return null;}
  const changes=[];
  if(counts.directoryAdded)changes.push({key:'visual-edit-favorites-v1',next:JSON.stringify(counts.favorites)});
  if(counts.added)changes.push({key,next:JSON.stringify({version:1,sources:counts.next})});
  if(counts.notesAdded)changes.push({key:notesKey,next:JSON.stringify({version:1,notes:noteRecords(counts.notes)})});
  if(counts.foldersAdded||counts.membersAdded)changes.push({key:foldersKey,next:JSON.stringify({version:1,folders:counts.folders})});
  const written=[];
  try{
   for(const change of changes){change.before=localStorage.getItem(change.key);localStorage.setItem(change.key,change.next);written.push(change);}
  }catch(error){
   let incomplete=false;
   for(const change of written.reverse())try{
    // Keep a newer change from another tab rather than overwriting it during rollback.
    if(localStorage.getItem(change.key)!==change.next){incomplete=true;continue;}
    if(change.before===null)localStorage.removeItem(change.key);else localStorage.setItem(change.key,change.before);
   }catch(rollbackError){incomplete=true;}
   try{sources=read();favoriteKeys=readFavorites();directoryNotes=readNotes();folders=readFolders();}catch(readError){}
   update();notice(incomplete?'partialImport':'failure');return null;
  }
  sources=counts.next;favoriteKeys=new Set(counts.favorites);directoryNotes=counts.notes;folders=counts.folders;storageAvailable=true;warning.hidden=true;
  update();return counts;
 }
 $<HTMLButtonElement>('collection-export-directory').addEventListener('click',()=>$<HTMLButtonElement>('export-favorites').click());
 $<HTMLButtonElement>('personal-export').addEventListener('click',()=>{
  try{
   const data={format:'the-reference-edit-collection',version:3,exportedAt:new Date().toISOString(),directoryFavorites:[...readFavorites()].map(webURL),sources:read(),directoryNotes:noteRecords(readNotes()),folders:readFolders().map(folder=>({name:folder.name,directory:[...folder.directory],personal:[...folder.personal]}))};
   const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=element('a');
   a.href=url;a.download='The Reference Edit - My collection.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){notice('corrupt');}
 });
 $<HTMLButtonElement>('personal-import-open').addEventListener('click',()=>{
  if(!collectionOpen)navigateDirectory(true);$<HTMLDetailsElement>('personal-backup').open=true;
  fileSelection++;pendingImport=null;fileInput.value='';importConfirm.disabled=true;
  $<HTMLParagraphElement>('personal-import-error').textContent='';$<HTMLParagraphElement>('personal-import-preview').textContent='';importDialog.showModal();fileInput.focus();
 });
 fileInput.addEventListener('change',async()=>{
  const selection=++fileSelection,file=fileInput.files[0];pendingImport=null;importConfirm.disabled=true;
  $<HTMLParagraphElement>('personal-import-error').textContent='';$<HTMLParagraphElement>('personal-import-preview').textContent='';
  if(!file)return;
  try{
   if(file.size>5*1024*1024)throw Error('Size');const data=JSON.parse(await file.text());
   if(selection!==fileSelection)return;
   if(!((data?.format==='the-reference-edit-collection'&&[1,2,3].includes(data.version))||(data?.format==='the-reference-edit-personal-sources'&&data.version===1))||!Array.isArray(data.sources)||!data.sources.every(valid))throw Error('Backup');
   const directoryFavorites=data.format==='the-reference-edit-collection'?data.directoryFavorites:[];
   if(!Array.isArray(directoryFavorites)||!directoryFavorites.every(url=>typeof url==='string'&&url.length<=2048))throw Error('Favorites');
   const notes=data.format==='the-reference-edit-collection'&&(data.version===2||data.version===3)?data.directoryNotes:[];
   if(!Array.isArray(notes)||!notes.every(validNote))throw Error('Notes');
   const folders=data.format==='the-reference-edit-collection'&&data.version===3?data.folders:[];
   if(!Array.isArray(folders)||folders.length>folderImportLimit||!folders.every(folder=>folder&&typeof folder.name==='string'&&!!folder.name.trim()&&folder.name.length<=folderNameLimit&&Array.isArray(folder.directory)&&folder.directory.every(url=>typeof url==='string'&&url.length<=2048)&&Array.isArray(folder.personal)&&folder.personal.every(id=>typeof id==='string'&&/^[-a-zA-Z0-9]{1,80}$/.test(id))))throw Error('Folders');
   const incoming=data.sources.map(source=>{
    const clean:Record<string,any>={id:source.id,favorite:source.favorite};for(const name of Object.keys(fields))clean[name]=source[name];
    clean.url=webURL(clean.url);if(clean.image)clean.image=webURL(clean.image);if(!valid(clean))throw Error('Backup');return clean;
   });
   pendingImport={sources:incoming,directoryFavorites:directoryFavorites.map(webURL),directoryNotes:notes.map(note=>({url:webURL(note.url),text:note.text})),folders:folders.map(folder=>({name:folder.name.trim(),directory:folder.directory.map(webURL),personal:[...folder.personal]}))};importConfirm.disabled=false;previewImport();
  }catch(error){if(selection===fileSelection)$<HTMLParagraphElement>('personal-import-error').textContent=label('invalidBackup');}
 });
 $<HTMLButtonElement>('personal-import-cancel').addEventListener('click',()=>importDialog.close());
 importDialog.addEventListener('close',()=>{if(importDialog.open)return;fileSelection++;pendingImport=null;$<HTMLButtonElement>('personal-import-open').focus({preventScroll:true});});
 importConfirm.addEventListener('click',()=>{
  if(!pendingImport)return;const counts=commitImport(pendingImport);
  if(counts){
   only=false;kind='all';$<HTMLInputElement>('personal-search').value='';render();lastImport=counts;importDialog.close();$<HTMLParagraphElement>('personal-transfer-status').textContent=formatCounts('imported',counts);
  }else $<HTMLParagraphElement>('personal-import-error').textContent=warning.textContent;
 });
 window.addEventListener('visual-edit:languagechange',()=>{
  previewImport();if(lastImport)$<HTMLParagraphElement>('personal-transfer-status').textContent=formatCounts('imported',lastImport);
 });

 window.addEventListener('visual-edit:languagechange',localize);reload();
})();

