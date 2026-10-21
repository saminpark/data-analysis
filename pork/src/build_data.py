"""Build the portable, dependency-free meeting demo from retained source data."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'src/data.json').read_text(encoding='utf-8'))
template=(ROOT/'src/index.template.html').read_text(encoding='utf-8').replace('__APP_JS__',(ROOT/'src/app.js').read_text(encoding='utf-8'))
out=template.replace('__DATA_JSON__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/'))
(ROOT/'index.html').write_text(out,encoding='utf-8')
print(json.dumps({'trades':len(data['trades']),'customs_rows':len(data['customs']),'html_bytes':len(out.encode())}))

