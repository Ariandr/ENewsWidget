// Native details and checkbox controls keep keyboard and screen-reader behavior.
export function mountMultiSelect(root,{label,options,selected,onChange}) {
  const summary = document.createElement('summary');
  summary.setAttribute('aria-label',label);
  const panel = document.createElement('fieldset'); panel.className = 'dropdown-panel';
  const legend = document.createElement('legend'); legend.className = 'sr-only'; legend.textContent = label; panel.append(legend);
  const inputs = options.map(value => {
    const row = document.createElement('label');
    const input = document.createElement('input');input.type = 'checkbox';input.value = value;
    input.addEventListener('change',()=>onChange(inputs.filter(i=>i.checked).map(i=>i.value)));
    row.append(input,document.createTextNode(value === 'All' ? 'Global events' : value)); panel.append(row);
    return input;
  });
  root.replaceChildren(summary,panel);
  function update(values) {
    inputs.forEach(input=>{input.checked = values.includes(input.value);});
    summary.textContent = values.length === options.length ? label : values.length === 0 ? `${label} · None` : `${label} · ${values.length}`;
  }
  update(selected);
  root.addEventListener('toggle',()=>{
    if (root.open) document.querySelectorAll('.multi-select').forEach(other=>{if(other !== root) other.open = false;});
  });
  document.addEventListener('click',event=>{if (!root.contains(event.target)) root.open = false;});
  root.addEventListener('keydown',event=>{
    if(event.key === 'Escape') {root.open = false;summary.focus();event.preventDefault();}
  });
  return update;
}
