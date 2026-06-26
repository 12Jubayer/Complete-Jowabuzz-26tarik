import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

docx = Path(r'c:\Users\ASUS\Downloads\WinyPay_Bangladash_Documentation-4.docx')
out = Path(__file__).resolve().parent.parent / 'WINYPAY_DOC_EXTRACT.txt'

z = zipfile.ZipFile(docx)
root = ET.fromstring(z.read('word/document.xml'))
texts = [t.text for t in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
out.write_text('\n'.join(texts), encoding='utf-8')
print('written', out)
