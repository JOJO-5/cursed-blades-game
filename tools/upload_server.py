#!/usr/bin/env python3
"""Simple HTTP server for uploading sprite sheet images."""

import os
import sys
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

UPLOAD_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'source_sheets'
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


class UploadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(self._get_upload_form().encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self._send_error(400, 'No content')
            return

        content_type = self.headers.get('Content-Type', '')
        if not content_type.startswith('multipart/form-data'):
            self._send_error(400, 'Content-Type must be multipart/form-data')
            return

        boundary = content_type.split('boundary=')[1].encode('utf-8')
        body = self.rfile.read(content_length)

        parts = body.split(b'--' + boundary)
        for part in parts:
            if b'filename=' in part:
                filename_start = part.find(b'filename="') + 10
                filename_end = part.find(b'"', filename_start)
                filename = part[filename_start:filename_end].decode('utf-8')

                ext = filename.split('.')[-1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    self._send_error(400, f'Invalid extension: {ext}')
                    return

                data_start = part.find(b'\r\n\r\n') + 4
                data_end = part.rfind(b'\r\n--')
                file_data = part[data_start:data_end]

                save_path = UPLOAD_DIR / filename
                with open(save_path, 'wb') as f:
                    f.write(file_data)

                print(f'Uploaded: {filename} ({len(file_data)} bytes)')

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write('<html><body><h1>Upload successful!</h1><p><a href="/">Upload more</a></p></body></html>'.encode('utf-8'))

    def _send_error(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(message.encode('utf-8'))

    def _get_upload_form(self):
        existing_files = [f.name for f in UPLOAD_DIR.glob('*.png')]
        existing_list = '<ul>' + ''.join(f'<li>{f}</li>' for f in existing_files) + '</ul>' if existing_files else '<p>暂无文件</p>'

        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>素材上传</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; }}
        .upload-box {{ border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; }}
        .upload-box:hover {{ border-color: #4CAF50; }}
        input[type="file"] {{ display: none; }}
        button {{ background: #4CAF50; color: white; padding: 12px 24px; border: none; cursor: pointer; }}
        button:hover {{ background: #45a049; }}
    </style>
</head>
<body>
    <h1>游戏素材上传</h1>
    <p>请上传以下素材大图（透明背景PNG格式）：</p>
    <ul>
        <li><strong>weapons_melee.png</strong> - 近战武器（剑、锤、镰刀、盾牌等）</li>
        <li><strong>weapons_magic.png</strong> - 魔法武器（魔杖、书本、法杖等）</li>
        <li><strong>enemies.png</strong> - 敌人（盗贼、弓箭手、野猪、蜘蛛等）</li>
        <li><strong>ringblade_traveler.png</strong> - 环刀旅者（主角、武器、Boss）</li>
        <li><strong>props.png</strong> - 场景道具（墙壁、地板、装饰物）</li>
    </ul>

    <div class="upload-box" id="drop-area">
        <p>点击或拖拽文件到此处上传</p>
        <label for="file-input">
            <button>选择文件</button>
        </label>
        <input type="file" id="file-input" accept="image/png,image/jpeg" multiple>
    </div>

    <h2>已上传的文件：</h2>
    {existing_list}

    <script>
        const dropArea = document.getElementById('drop-area');
        const fileInput = document.getElementById('file-input');

        dropArea.addEventListener('click', () => fileInput.click());

        dropArea.addEventListener('dragover', (e) => {{
            e.preventDefault();
            dropArea.style.borderColor = '#4CAF50';
        }});

        dropArea.addEventListener('dragleave', () => {{
            dropArea.style.borderColor = '#ccc';
        }});

        dropArea.addEventListener('drop', (e) => {{
            e.preventDefault();
            dropArea.style.borderColor = '#ccc';
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }});

        fileInput.addEventListener('change', () => {{
            const files = Array.from(fileInput.files);
            if (files.length === 0) return;

            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            fetch('/', {{ method: 'POST', body: formData }})
                .then(() => location.reload())
                .catch(err => alert('上传失败: ' + err));
        }});
    </script>
</body>
</html>'''

    def log_message(self, format, *args):
        print(f'[{self.address_string()}] {format % args}')


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = HTTPServer(('0.0.0.0', port), UploadHandler)
    print(f'=== 上传服务器启动 ===')
    print(f'访问地址: http://localhost:{port}')
    print(f'上传目录: {UPLOAD_DIR}')
    print(f'按 Ctrl+C 停止服务器')
    server.serve_forever()


if __name__ == '__main__':
    main()
