#!/usr/bin/env python3
"""
Simple test server to verify SPA functionality
Run with: python test-server.py
"""

import http.server
import socketserver
import os
import json

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # Log requests for debugging
        print(f"GET Request: {self.path}")
        
        # Handle fragment requests
        if self.path.startswith('/fragments/'):
            fragment_file = self.path[1:]  # Remove leading /
            if os.path.exists(fragment_file):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                with open(fragment_file, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
                print(f"✓ Served fragment: {fragment_file}")
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Fragment not found')
                print(f"✗ Fragment not found: {fragment_file}")
        else:
            # Handle normal files
            super().do_GET()

PORT = 8000

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           eDM Helper SPA Test Server                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Server running at: http://localhost:{PORT}                                          ║
║                                                                              ║
║ Test Checklist:                                                               ║
║ 1. Open http://localhost:{PORT} in browser                                     ║
║ 2. Check console for "Initializing..." messages                               ║
║ 3. Look for sidebar toggle button (☰)                                        ║
║ 4. Try clicking menu items                                                    ║
║ 5. Check Network tab for fragment requests                                   ║
║                                                                              ║
║ Fragments available:                                                          ║
""")
        
        # List available fragments
        if os.path.exists('fragments'):
            for file in os.listdir('fragments'):
                if file.endswith('.html'):
                    print(f"   - /fragments/{file}")
        
        print(f"""
╚══════════════════════════════════════════════════════════════════════════════╝

Press Ctrl+C to stop the server
        """)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
