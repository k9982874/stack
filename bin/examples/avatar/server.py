import io
import json
import requests

from os import curdir, sep

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from cgi import parse_header, parse_multipart, FieldStorage

from PIL import Image

STACK_URL = 'http://127.0.0.1:8000'


class RequestHandler(BaseHTTPRequestHandler):

    def crop(self, x, y, w, h, r, file_data):
        img = Image.open(io.BytesIO(file_data))

        src_w, src_h = img.size

        dst_x = max(x, 0)
        dst_y = max(y, 0)

        dst_w = min(dst_x + w, src_w)
        dst_h = min(dst_y + h, src_h)

        if r != 0:
            img = img.rotate(r)

        img = img.crop((dst_x, dst_y, dst_w, dst_h))

        output = io.BytesIO()

        img.save(output, format='PNG')

        output.seek(0)

        contents = output.read()

        output.close()

        return contents

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'

        try:
            if self.path.startswith('/stack/'):
                url = STACK_URL + '/file/' + self.path[7:]
                print(url)

                r = requests.get(url)

                self.send_response(200)
                self.send_header('Content-type', 'image/png')
                self.end_headers()
                self.wfile.write(r.content)

                return

            sendReply = False
            if self.path.endswith('.html'):
                mimetype = 'text/html'
                sendReply = True
            elif self.path.endswith('.png'):
                mimetype = 'image/png'
                sendReply = True
            elif self.path.endswith('.jpg'):
                mimetype = 'image/jpg'
                sendReply = True
            elif self.path.endswith('.gif'):
                mimetype = 'image/gif'
                sendReply = True
            elif self.path.endswith('.js'):
                mimetype = 'application/javascript'
                sendReply = True
            elif self.path.endswith('.css'):
                mimetype = 'text/css'
                sendReply = True

            if sendReply is True:
                f = open(curdir + sep + self.path)
                self.send_response(200)
                self.send_header('Content-type', mimetype)
                self.end_headers()
                self.wfile.write(f.read())
                f.close()
            return

        except IOError:
            self.send_error(404, 'File Not Found: %s' % self.path)

    def do_POST(self):
        form = FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                'REQUEST_METHOD': 'POST',
            }
        )

        data = json.loads(form['avatar_data'].value)

        contents = self.crop(data['x'], data['y'], data['width'], data['height'], data['rotate'], form['avatar_file'].value)

        url = STACK_URL + '/upload'
        files = {'file': (form['avatar_file'].filename, contents)}

        r = requests.post(url, files=files)

        data = json.loads(r.content)

        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(
            {'state': 200, 'result': 'http://127.0.0.1:8080/stack/' + data['filename']}))

server = HTTPServer(('', 8080), RequestHandler)
server.serve_forever()
