import re, sys, os
root = sys.argv[1]; out = sys.argv[2]
order = ['js/store.js','js/ui.js','js/schemas.js','js/metrics.js','js/views/drawing.js','js/seed.js',
 'js/views/home.js','js/views/course.js','js/views/planning.js','js/views/advisor.js','js/views/timeline.js',
 'js/views/academic.js','js/views/archive.js','js/views/settings.js','js/app.js']
def mod(path): return '__m_' + re.sub(r'\W','_', os.path.splitext(path)[0].replace('js/',''))
def resolve(frm, spec): return os.path.normpath(os.path.join(os.path.dirname(frm), spec)).replace('\\','/')
parts=[]
for p in order:
    src = open(os.path.join(root,p), encoding='utf-8').read()
    def imp(m):
        names, spec = m.group(1), m.group(2)
        target = mod(resolve(p, spec))
        if names.strip().startswith('*'):
            alias = names.split(' as ')[1].strip()
            return f'const {alias} = {target};'
        return f'const {names.strip()} = {target};'
    src = re.sub(r"import\s+(\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+'([^']+)';", imp, src)
    assert 'import ' not in re.sub(r'//.*','',src) or p=='x', ('leftover import', p)
    exports = re.findall(r'^export\s+(?:const|function|let)\s+(\w+)', src, re.M)
    src = re.sub(r'^export\s+', '', src, flags=re.M)
    parts.append(f"// ===== {p} =====\nconst {mod(p)} = (() => {{\n{src}\nreturn {{ {', '.join(exports)} }};\n}})();\n")
js = '\n'.join(parts)
css = open(os.path.join(root,'css/styles.css'), encoding='utf-8').read()
fav = open(os.path.join(root,'assets/favicon.svg'), encoding='utf-8').read().strip()
import urllib.parse
fav_uri = 'data:image/svg+xml,' + urllib.parse.quote(fav)
html = open(os.path.join(root,'index.html'), encoding='utf-8').read()
html = html.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />', f'<link rel="icon" href="{fav_uri}" type="image/svg+xml" />')
html = html.replace('<link rel="stylesheet" href="css/styles.css" />', '<style>\n'+css+'\n</style>')
assert '</script' not in js
html = html.replace('<script type="module" src="js/app.js"></script>', '<script type="module">\n'+js+'\n</script>')
assert 'href="css/styles.css"' not in html and 'src="js/app.js"' not in html
open(out,'w',encoding='utf-8').write(html)
print('ok', len(html))
