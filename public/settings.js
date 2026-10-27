import {loadPreferences,savePreferences,saveManualPreferences,preferencesURL,applyTheme,CURRENCIES,IMPACTS} from './preferences.js';
import {mountMultiSelect} from './multiselect.js';
const state = loadPreferences();
const form = document.getElementById('preferences');
for (const control of form.elements) {
  if (!control.name || !(control.name in state)) continue;
  if (control.type === 'checkbox') control.checked = state[control.name];
  else control.value = state[control.name];
}
function update(changes) {
  const manualPersisted = changes ? saveManualPreferences(changes) : true;
  const persisted = savePreferences(state) && manualPersisted;
  applyTheme(state.theme);
  const url = preferencesURL('./index.html',state);
  history.replaceState(null,'',preferencesURL('./settings.html',state));
  for (const id of ['back','preview']) document.getElementById(id).href = url;
  document.getElementById('embed-url').value = url;
  document.getElementById('saved').textContent = persisted
    ? 'Settings saved in this browser.'
    : 'Browser storage unavailable. Copy the embed link and replace the Notion embed URL to keep these settings.';
  document.getElementById('link-fallback').hidden = true;
}
for (const [id,label,options] of [['currencies','Currencies',CURRENCIES],['impacts','Impact',IMPACTS]]) {
  const updateSelection = mountMultiSelect(document.getElementById(id),{label,options,selected:state[id],onChange:values=>{state[id]=values;updateSelection(values);update({[id]:values});}});
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{
  const control = event.target;
  if (!control.name || !(control.name in state)) return;
  state[control.name] = control.type === 'checkbox' ? control.checked : control.value;
  update({[control.name]:state[control.name]});
});
document.getElementById('copy').onclick = async()=>{
  const url = preferencesURL('./index.html',state);
  try {await navigator.clipboard.writeText(url);document.getElementById('saved').textContent = 'Embed link copied. Replace the Notion embed URL with this link to keep these defaults.';}
  catch {document.getElementById('link-fallback').hidden=false;document.getElementById('embed-url').select();document.getElementById('saved').textContent='Copy the link below.';}
};
update();
