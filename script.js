(function(){
  /* Elements */
  const tabs = document.querySelectorAll('.ribbon-tab');
  const panes = document.querySelectorAll('.ribbon-pane');
  const docContainer = document.getElementById('doc-container');
  const pageTemplate = document.getElementById('pageTemplate');
  const pageCountSpan = document.getElementById('pageCount');
  const docNameInput = document.getElementById('docName');

  /* === AutoSave === */
const AUTOSAVE_KEY = "webword-autosave";
const statusEl = document.getElementById("autosaveStatus");

function saveToLocal(){
  if(!statusEl) return;
  statusEl.textContent = "Saving...";
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ html: buildSavedHTML(), name: docNameInput.value }));
    setTimeout(()=>{ statusEl.textContent = "Saved"; }, 500);
  } catch(e){
    statusEl.textContent = "Not saved";
  }
}

function restoreFromLocal(){
  const saved = localStorage.getItem(AUTOSAVE_KEY); if(!saved) return;
  const data = JSON.parse(saved);
  docNameInput.value = data.name || "Untitled";
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.html, "text/html");
  const loadedPages = doc.querySelectorAll(".page");
  docContainer.innerHTML = "";
  loadedPages.forEach(lp => docContainer.appendChild(lp));
  updatePageCount();
  if(statusEl) statusEl.textContent = "Saved (restored)";
}

// Restore immediately
restoreFromLocal();
// Auto-save every 5 seconds
setInterval(saveToLocal, 5000);


  /* Ribbon actions  */
  function setActiveTab(name){
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    panes.forEach(p => p.classList.toggle('hidden', p.id !== `pane-${name}`));
  }
  tabs.forEach(t => t.addEventListener('click', ()=> setActiveTab(t.dataset.tab)));

  /* Page management  */
  function createPage(){
    const node = pageTemplate.content.firstElementChild.cloneNode(true);
    const body = node.querySelector('.page-body');

    // paste handler 
    body.addEventListener('paste', e => {
      try {
        const html = (e.clipboardData || window.clipboardData).getData('text/html') ||
                     (e.clipboardData || window.clipboardData).getData('text/plain');
        if(html){
          e.preventDefault();
          document.execCommand('insertHTML', false, html);
        }
      } catch(_) {  }
    });

    // drag & drop images
    body.addEventListener('dragover', ev=>ev.preventDefault());
    body.addEventListener('drop', ev=>{
      ev.preventDefault();
      const f = ev.dataTransfer.files && ev.dataTransfer.files[0];
      if(f && f.type.startsWith('image/')){
        const reader = new FileReader();
        reader.onload = e => {
          insertImageAtSelection(e.target.result);
        };
        reader.readAsDataURL(f);
      }
    });

    return node;
  }

  function renderInitial(){ /* deletes all the pages curretely*/
    docContainer.innerHTML='';
    addPage();
    docContainer.querySelectorAll('.page-header').forEach(h=> h.style.display = 'none');
    docContainer.querySelectorAll('.page-footer').forEach(f=> f.style.display = 'none');
    docContainer.classList.remove('editing-header','editing-footer');
  }

  function addPage(afterNode){
    const page = createPage();
    if(afterNode && afterNode.parentNode === docContainer){
      docContainer.insertBefore(page, afterNode.nextSibling);
    } else {
      docContainer.appendChild(page);
    }
    updatePageCount();
    const last = docContainer.lastElementChild;
    last.querySelector('.page-body').focus();
  }

  function updatePageCount(){
    pageCountSpan.textContent = docContainer.querySelectorAll('.page').length;
  }

  /* Start */
  renderInitial();

  /* File actions */
 const modal = document.getElementById('newDocModal');
const confirmBtn = document.getElementById('confirmNewDoc');
const cancelBtn = document.getElementById('cancelNewDoc');

document.getElementById('btnNew').addEventListener('click', ()=>{
  modal.classList.remove('hidden'); // show modal instead of confirm()
});

confirmBtn.addEventListener('click', ()=>{
  renderInitial();
  docNameInput.value = 'Untitled';
  modal.classList.add('hidden');
});

cancelBtn.addEventListener('click', ()=>{
  modal.classList.add('hidden'); // just hide modal
});


  document.getElementById('btnAddPage').addEventListener('click', ()=> addPage());

  document.getElementById('btnPageBreak').addEventListener('click', ()=>{
    const sel = window.getSelection();
    const page = findAncestor(sel.anchorNode, 'page');
    addPage(page);
  });
  document.getElementById('btnRename').addEventListener('click', ()=>{
    docNameInput.focus();
    docNameInput.select();
  });

  /* Save HTML  */
  function buildSavedHTML(){
    const pages = Array.from(docContainer.querySelectorAll('.page')).map((p, idx)=>{
      const bodyHtml = p.querySelector('.page-body').innerHTML;
      const headerHtml = p.querySelector('.page-header').innerHTML;
      const footerHtml = p.querySelector('.page-footer').innerHTML;
      return `<div class="page">${headerHtml}<div class="page-body">${bodyHtml}</div>${footerHtml}</div>`;
    }).join('\n');

    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(docNameInput.value)}</title>
      <style>body{font-family:Arial;}</style></head><body>${pages}</body></html>`;
  }
  /*Export buttons*/
function exportFile(content, mimeType, extension){
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (docNameInput.value || 'document') + extension;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

document.getElementById('btnSaveHTML').addEventListener('click', ()=> exportFile(buildSavedHTML(), 'text/html', '.html'));
document.getElementById('btnSaveDoc').addEventListener('click', ()=> exportFile(buildSavedHTML(), 'application/msword', '.doc'));
document.getElementById('btnExportODT').addEventListener('click', ()=> exportFile(buildSavedHTML(), 'application/vnd.oasis.opendocument.text', '.odt'));
document.getElementById('btnExportPDF').addEventListener('click', ()=> window.print());


  document.getElementById('btnSaveHTML').addEventListener('click', ()=>{
    const full = buildSavedHTML();
    const blob = new Blob([full], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (docNameInput.value || 'document') + '.html';
    a.click();
  });

  /* Save as .doc  */
  document.getElementById('btnSaveDoc').addEventListener('click', ()=>{
    const full = buildSavedHTML();
    const blob = new Blob([full], {type: 'application/msword'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (docNameInput.value || 'document') + '.doc';
    a.click();
  });

  /* Print  */
  document.getElementById('btnPrint').addEventListener('click', ()=>{
    const full = buildSavedHTML();
    const w = window.open('', '', 'height=800,width=900');
    w.document.write(full);
    w.document.close();
    setTimeout(()=>{ w.print(); }, 400);
  });

  /* Open */
  const openInput = document.getElementById('openFileInput');
  document.getElementById('btnOpen').addEventListener('click', ()=> openInput.click());
  openInput.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, 'text/html');
      const loadedPages = doc.querySelectorAll('.page');
      docContainer.innerHTML = '';
      if(loadedPages.length){
        loadedPages.forEach(lp=>{
          const p = createPage();
          const pNode = p.querySelector('.page');
          pNode.querySelector('.page-header').innerHTML = lp.querySelector('.page-header') ? lp.querySelector('.page-header').innerHTML : '';
          pNode.querySelector('.page-body').innerHTML = lp.querySelector('.page-body') ? lp.querySelector('.page-body').innerHTML : lp.innerHTML;
          pNode.querySelector('.page-footer').innerHTML = lp.querySelector('.page-footer') ? lp.querySelector('.page-footer').innerHTML : '';
          docContainer.appendChild(p);
        });
      } else {
        renderInitial();
        docContainer.querySelector('.page-body').innerHTML = doc.body.innerHTML;
      }
      // hide headers/footers 
      docContainer.querySelectorAll('.page-header').forEach(h=> h.style.display = 'none');
      docContainer.querySelectorAll('.page-footer').forEach(f=> f.style.display = 'none');
      updatePageCount();
    };
    reader.readAsText(f);
  });

  /* Home ribbon:  using execCommand  */
  document.querySelectorAll('#pane-home [data-cmd]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      document.execCommand(btn.dataset.cmd, false, null);
      focusEditorIfAppropriate();
    });
  });

  

  /* Font/Highlight/Headings/Spacing handlers (*/
// Make execCommand use CSS styles instead of <font> tags
document.execCommand('styleWithCSS', false, true);

// Font Family
document.getElementById('fontName').addEventListener('change', e => {
    const font = e.target.value;
    document.execCommand('fontName', false, font);
});

// Font Size (robust)
document.getElementById('fontSize').addEventListener('change', e => {
    const pxSize = e.target.value; // px value like 10, 12, 14
    // Use execCommand to wrap selection in <font size="X">
    document.execCommand('fontSize', false, 7); // temporary max size

    // Replace the temporary font tags with span and correct px
    const editor = document.getElementById('editor');
    editor.querySelectorAll('font[size="7"]').forEach(fontTag => {
        const span = document.createElement('span');
        span.style.fontSize = `${pxSize}px`;
        span.innerHTML = fontTag.innerHTML;
        fontTag.replaceWith(span);
    });
});

// Font Color
document.getElementById('fontColor').addEventListener('input', e => {
    const color = e.target.value;
    document.execCommand('foreColor', false, color);
});

  document.getElementById('fontColor').addEventListener('input', e=>{
    document.execCommand('foreColor', false, e.target.value);
  });
  document.getElementById('highlighter').addEventListener('input', e=>{
    const color = e.target.value;
    try{
      document.execCommand('hiliteColor', false, color);
    }catch(_){
      applyStyleToSelection(`background-color:${color}`);
    }
  });
  document.querySelectorAll('.heading-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const h = b.dataset.h;
      document.execCommand('formatBlock', false, h);
      const sel = window.getSelection();
      if(sel && sel.anchorNode){
        const block = getBlockElement(sel.anchorNode);
        if(block && !block.id) block.id = generateIdFromText(block.innerText);
      }
      focusEditorIfAppropriate();
    });
  });
 

  /* Insert image */
  const imgInput = document.getElementById('imageInput');
  document.getElementById('btnInsertImage').addEventListener('click', ()=> imgInput.click());
  imgInput.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      insertImageAtSelection(ev.target.result);
    };
    reader.readAsDataURL(f);
  });

  function insertImageAtSelection(dataURL){
    const sel = window.getSelection();
    const page = findAncestor(sel.anchorNode, 'page') || docContainer.lastElementChild;
    const body = page.querySelector('.page-body');
    if(findAncestor(sel.anchorNode, 'page') === page){
      document.execCommand('insertImage', false, dataURL);
      const imgs = page.querySelectorAll('img');
      const last = imgs[imgs.length-1];
      if(last){
        last.style.maxWidth = '100%';
        last.style.display = 'block';
        last.style.margin = '8px 0';
      }
    } else {
      const img = document.createElement('img');
      img.src = dataURL;
      body.appendChild(img);
    }
  }

  /* Textbox / Shapes / Links / Table  */
  document.getElementById('btnTextBox').addEventListener('click', ()=>{
    const sel = window.getSelection();
    const page = findAncestor(sel.anchorNode, 'page') || docContainer.lastElementChild;
    const body = page.querySelector('.page-body');
    const box = document.createElement('div');
    box.className = 'textbox';
    box.contentEditable = 'true';
    box.innerHTML = 'Text box';
    body.appendChild(box);
    box.focus();
  });

  function insertShape(svgHtml){
    const sel = window.getSelection();
    const page = findAncestor(sel.anchorNode, 'page') || docContainer.lastElementChild;
    const body = page.querySelector('.page-body');
    const wrapper = document.createElement('div');
    wrapper.className = 'shape';
    wrapper.innerHTML = svgHtml;
    body.appendChild(wrapper);
  }
  document.getElementById('btnShapeRect').addEventListener('click', ()=> {
    insertShape('<svg width="160" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="80" rx="6" ry="6" fill="#dbefff" stroke="#7aa6ff"/></svg>');
  });
  document.getElementById('btnShapeCircle').addEventListener('click', ()=> {
    insertShape('<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="36" fill="#ffd" stroke="#ffb347"/></svg>');
  });
  document.getElementById('btnShapeLine').addEventListener('click', ()=> {
    insertShape('<svg width="200" height="30" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="15" x2="200" y2="15" stroke="#888" stroke-width="2"/></svg>');
  });

  document.getElementById('btnLink').addEventListener('click', ()=>{
    const url = prompt('Enter URL (https://...)','https://');
    if(!url) return;
    const sel = window.getSelection();
    if(sel && !sel.isCollapsed){
      document.execCommand('createLink', false, url);
    } else {
      const text = prompt('Link text','Link');
      if(text){
        const aHtml = `<a href="${escapeAttr(url)}" target="_blank">${escapeHtml(text)}</a>`;
        document.execCommand('insertHTML', false, aHtml);
      }
    }
  });

  document.getElementById("btnInsertTable").addEventListener("click", () => {
  const rows = parseInt(document.getElementById("tableRows").value) || 2;
  const cols = parseInt(document.getElementById("tableCols").value) || 2;
    if(isNaN(rows) || isNaN(cols) || rows<=0 || cols<=0) return;
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.margin = '8px 0';
    for(let r=0;r<rows;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<cols;c++){
        const td = document.createElement('td');
        td.style.border = '1px solid #888';
        td.style.padding = '6px';
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);  
      }
      table.appendChild(tr);
    }
    const sel = window.getSelection();
    const page = findAncestor(sel.anchorNode, 'page') || docContainer.lastElementChild;
    const body = page.querySelector('.page-body');
    body.appendChild(table);
  });

  /* Header/Footer toggles: start hidden,  */
  let headerMode = false, footerMode = false; // <-- default hidden
  document.getElementById('btnToggleHeader')?.addEventListener('click', ()=>{
    headerMode = !headerMode;
    docContainer.querySelectorAll('.page-header').forEach(h => {
      h.style.display = headerMode ? 'block' : 'none';
    });
    if(headerMode){
      docContainer.classList.add('editing-header');
      const firstHeader = docContainer.querySelector('.page-header');
      if(firstHeader){ setCaretToEnd(firstHeader); firstHeader.focus(); }
    } else {
      docContainer.classList.remove('editing-header');
      focusFirstBody();
    }
  });
  document.getElementById('btnToggleFooter')?.addEventListener('click', ()=>{
    footerMode = !footerMode;
    docContainer.querySelectorAll('.page-footer').forEach(f => {
      f.style.display = footerMode ? 'block' : 'none';
    });
    if(footerMode){
      docContainer.classList.add('editing-footer');
      const firstFooter = docContainer.querySelector('.page-footer');
      if(firstFooter){ setCaretToEnd(firstFooter); firstFooter.focus(); }
    } else {
      docContainer.classList.remove('editing-footer');
      focusFirstBody();
    }
  });

  function focusFirstBody(){
    const firstBody = docContainer.querySelector('.page-body');
    if(firstBody) firstBody.focus();
  }

  function setCaretToEnd(el){
    if(!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* Layout: margins, orientation, paper  */
  document.getElementById('marginPreset').addEventListener('change', e=>{
    document.documentElement.style.setProperty('--page-margin', e.target.value);
    docContainer.querySelectorAll('.page').forEach(p=>{
      p.style.padding = e.target.value;
    });
  });

  document.getElementById('applyMargin').addEventListener('click', ()=>{
    const mm = parseInt(document.getElementById('customMargin').value || 20);
    const val = mm + 'mm';
    document.documentElement.style.setProperty('--page-margin', val);
    docContainer.querySelectorAll('.page').forEach(p=> p.style.padding = val);
  });

  document.getElementById('orientPortrait').addEventListener('click', ()=> {
    document.body.classList.remove('landscape');
  });
  document.getElementById('orientLandscape').addEventListener('click', ()=> {
    document.body.classList.add('landscape');
  });

  document.getElementById('paperSize').addEventListener('change', e=>{
    const val = e.target.value;
    if(val === 'A4'){
      document.documentElement.style.setProperty('--page-width-mm','210mm');
      document.documentElement.style.setProperty('--page-height-mm','297mm');
    } else if(val === 'Letter'){
      document.documentElement.style.setProperty('--page-width-mm','216mm');
      document.documentElement.style.setProperty('--page-height-mm','279mm');
    }
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e=>{
    const isMod = e.ctrlKey || e.metaKey;
    if(!isMod) return;
    const active = document.activeElement;
    const isPlainInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.isContentEditable;
    if(isPlainInput) return;

    const key = e.key.toLowerCase();

    if(key === 's'){ e.preventDefault(); document.getElementById('btnSaveHTML').click(); return; }
    if(key === 'b'){ e.preventDefault(); document.execCommand('bold'); return; }
    if(key === 'i'){ e.preventDefault(); document.execCommand('italic'); return; }
    if(key === 'u'){ e.preventDefault(); document.execCommand('underline'); return; }
    // Ctrl+C / Ctrl+X / Ctrl+V 
    if(key === 'enter'){ 
      // Ctrl+Enter page break
      e.preventDefault();
      const sel = window.getSelection();
      const page = findAncestor(sel.anchorNode, 'page');
      addPage(page);
      return;
    }
  });

   
  docContainer.addEventListener('click', e=>{
    const body = e.target.closest('.page-body');
    if(body){
      try{
        const pos = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
        if(pos){
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(pos);
        } else {
          body.focus();
        }
      }catch(_){ body.focus(); }
    }
  });

  

  /* page count */
  const observer = new MutationObserver(updatePageCount);
  observer.observe(docContainer, {childList:true, subtree:false});

  /* Helper functions  */
  function findAncestor(node, className){
    while(node && node !== document){
      if(node.classList && node.classList.contains(className)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function applyStyleToSelection(styleText){
    const sel = window.getSelection();
    if(!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if(range.collapsed){
      const body = findAncestor(sel.anchorNode, 'page')?.querySelector('.page-body') || document.querySelector('.page-body');
      if(body) body.style.cssText += ';' + styleText;
      return;
    }
    const span = document.createElement('span');
    span.style.cssText = styleText;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const r2 = document.createRange();
    r2.selectNodeContents(span);
    sel.addRange(r2);
  }

  function getBlockElement(node){
    while(node && node !== document){
      if(node.nodeType === 1){
        const display = getComputedStyle(node).display;
        if(display === 'block' || node.tagName.match(/^H[1-6]$/i) || node.tagName === 'P' || node.tagName === 'DIV') return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

  /* TOC generation  */
  document.getElementById('btnTOC').addEventListener('click', ()=>{
    const headings = [];
    const pages = Array.from(docContainer.querySelectorAll('.page'));
    pages.forEach((p, pageIdx)=>{
      const body = p.querySelector('.page-body');
      body.querySelectorAll('h1,h2,h3').forEach(h=>{
        if(!h.id) h.id = generateIdFromText(h.innerText);
        headings.push({text: h.innerText, id: h.id, tag: h.tagName.toLowerCase(), page: pageIdx+1});
      });
    });

    const tocPage = createPage();
    const pageNode = tocPage.querySelector('.page');
    const bodyNode = pageNode.querySelector('.page-body');
    bodyNode.innerHTML = '<div class="toc"><h2>Table of Contents</h2></div>';
    const container = bodyNode.querySelector('.toc');

    if(headings.length === 0){
      container.innerHTML += '<p>No headings found to build TOC.</p>';
    } else {
      headings.forEach(h=>{
        const entry = document.createElement('div');
        entry.className = 'toc-entry';
        entry.innerHTML = `<a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a> <span style="color:#666"> (p.${h.page})</span>`;
        container.appendChild(entry);
      });
    }
    const first = docContainer.firstElementChild;
    docContainer.insertBefore(tocPage, first);
    updatePageCount();
  });

  function generateIdFromText(text){
    return 'h-' + text.trim().toLowerCase().replace(/[^\w]+/g,'-').slice(0,40) + '-' + Math.floor(Math.random()*10000);
  }

  /* Expose helpers */
  window.WebWord = { addPage, createPage, renderInitial };

})();



// Autosave function
function autosave() {
    const data = {
        filename: filename.value || 'untitled',
        content: content.innerHTML
    };
    localStorage.setItem('autosaveData', JSON.stringify(data));
    console.log('Autosaved'); 
}
 
// Restore function on page load
function autosave() {
  const data = {
    filename: document.getElementById("docName").value,
    content: document.querySelector(".page-body").innerHTML
  };
  localStorage.setItem("autosaveData", JSON.stringify(data));

  // Update status
  document.getElementById("autosaveStatus").textContent = "Saved";
}

function restoreAutosave() {
  const savedData = localStorage.getItem("autosaveData");
  if (savedData) {
    const data = JSON.parse(savedData);

    // Restore document name
    document.getElementById("docName").value = data.filename || "Untitled";

    // Restore page content
    if (data.content) {
      const pageBody = document.querySelector(".page-body");
      pageBody.innerHTML = data.content;
    }
  }
}

// Run restore once DOM is ready
window.addEventListener("DOMContentLoaded", restoreAutosave);

// Autosave every 5 seconds
setInterval(autosave, 5000);



/* === Share Options === */
document.getElementById("btnShareLink").addEventListener("click", () => {
  const blob = new Blob([buildSavedHTML()], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  navigator.clipboard.writeText(url).then(() => {
    alert("Share link copied to clipboard!");
  });
});
document.getElementById("btnShareDownload").addEventListener("click", () => {
  document.getElementById("btnSaveHTML").click();   
});

/* === Export Options === */
document.getElementById("btnExportPDF").addEventListener("click", () => {
  window.print(); 
  // user can choose "Save as PDF"
});
document.getElementById("btnExportODT").addEventListener("click", () => {
  const full = buildSavedHTML();
  const blob = new Blob([full], { type: "application/vnd.oasis.opendocument.text" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (docNameInput.value || "document") + ".odt";
  a.click();
});
const statusEl = document.getElementById("autosaveStatus");

function saveToLocal() {
  statusEl.textContent = "Saving...";
  const html = buildSavedHTML();
  const data = { html, name: docNameInput.value };
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    setTimeout(() => { statusEl.textContent = "Saved"; }, 500);
  } catch (e) {
    statusEl.textContent = "Not saved";
  }
}

function restoreFromLocal() {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (!saved) return;
  const data = JSON.parse(saved);
  docNameInput.value = data.name || "Untitled";
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.html, "text/html");
  const loadedPages = doc.querySelectorAll(".page");
  docContainer.innerHTML = "";
  loadedPages.forEach(lp => docContainer.appendChild(lp));
  updatePageCount();
  statusEl.textContent = "Saved (restored)";
}

const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  // Save user preference in localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});

// Load saved theme on page load
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
  }
});

//replace//

const editor = document.getElementById("doc-container");
const findInput = document.getElementById("findText");
const replaceInput = document.getElementById("replaceText");
const replaceAllBtn = document.getElementById("replaceAllBtn");

replaceAllBtn.addEventListener("click", () => {
  let findValue = findInput.value;
  let replaceValue = replaceInput.value;

  if (!findValue) return alert("Please enter text to find.");

  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapeRegExp(findValue), "g");

  
  editor.innerHTML = editor.innerHTML.replace(regex, replaceValue);
});

