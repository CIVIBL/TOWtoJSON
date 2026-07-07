# Dev server with caching disabled. Plain `python -m http.server` sends no
# cache headers, so browsers heuristically cache ES modules and serve stale
# code after edits.
import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    http.server.test(HandlerClass=NoCacheHandler, port=8080)
