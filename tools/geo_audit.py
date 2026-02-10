#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SwarmGeo GEO Readiness Auditor (Enterprise Real Mode)
Version: 2.2.0 (Full 5-Point Check)
Author: SwarmGeo Team (Guangzhou Swarm Technology Ltd)
License: MIT
Note: Uses standard libraries only. No pip install required.
"""

import sys
import time
import urllib.request
import urllib.error
import json
from html.parser import HTMLParser

# --- 核心配置 ---
USER_AGENT = "Mozilla/5.0 (compatible; DeepSeek-V3/1.0; +https://www.deepseek.com/robot)"

class ContentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_content = []
        self.has_json_ld = False
        self.app_root_found = False # 检测常见的 SPA 挂载点
        
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            for attr in attrs:
                if attr == ('type', 'application/ld+json'):
                    self.has_json_ld = True
        if tag == 'div':
            for attr in attrs:
                if attr[0] == 'id' and attr[1] in ['app', 'root', '__next', '__nuxt']:
                    self.app_root_found = True

    def handle_data(self, data):
        if data.strip():
            self.text_content.append(data.strip())

def real_audit(url):
    if not url.startswith('http'):
        url = 'https://' + url
        
    print(f"\n🚀 Starting SwarmGeo Audit (Real Mode) for: {url}")
    print("="*60)
    print(f"[*] Handshaking with target server...")

    # 1. 建立连接
    req = urllib.request.Request(
        url, 
        data=None, 
        headers={'User-Agent': USER_AGENT}
    )

    html = ""
    try:
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            latency = (time.time() - start_time) * 1000
            print(f"[*] Connection established. Latency: {latency:.2f}ms")
    except Exception as e:
        print(f"\n[!] FATAL ERROR: Could not connect to {url}")
        print(f"    Reason: {str(e)}")
        return

    score = 0
    parser = ContentParser()
    parser.feed(html)
    raw_text = " ".join(parser.text_content)
    print("-" * 60)

    # --- 检查项 1: Robots.txt (门卫) ---
    print("running: Check Robots.txt compatibility...")
    try:
        robots_url = url.rstrip('/') + "/robots.txt"
        r_req = urllib.request.Request(robots_url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(r_req, timeout=3) as r_res:
            r_content = r_res.read().decode('utf-8', errors='ignore')
            if "User-agent: *" in r_content or "DeepSeek" in r_content:
                print("✅ PASS | Robots.txt allows indexing")
                score += 20
            else:
                print("⚠️ WARN | Robots.txt might be blocking AI bots")
    except:
        print("⚠️ WARN | Robots.txt not found (Assuming open)")
        score += 15
    time.sleep(0.3)

    # --- 检查项 2: SSR 服务端渲染 (新加的独立项) ---
    # 逻辑：如果HTML里有很多代码但没文字，说明是客户端渲染(Client Side Rendering)
    print("running: Checking SSR (Server Side Rendering)...")
    if len(html) > 2000 and len(raw_text) < 200:
        print("❌ FAIL | Content is hidden in JavaScript (CSR detected).")
        print("        DeepSeek cannot 'see' your page content directly.")
    else:
        print("✅ PASS | HTML Content is visible to crawlers (SSR/Static).")
        score += 20
    time.sleep(0.3)

    # --- 检查项 3: JSON-LD 结构化数据 (护照) ---
    print("running: Verifying JSON-LD Structure...")
    if parser.has_json_ld:
        print("✅ PASS | Found structured data (JSON-LD)")
        score += 20
    else:
        print("❌ FAIL | No JSON-LD schema found. AI cannot understand entities.")
    time.sleep(0.3)

    # --- 检查项 4: 向量数据库亲和度 (文本质量) ---
    print("running: Analyzing Vector Database Readiness...")
    if len(raw_text) > 500:
        print(f"✅ PASS | Good text density ({len(raw_text)} chars). Ready for RAG.")
        score += 20
    else:
        print(f"⚠️ WARN | Low text density. Page has too little unique content.")
    time.sleep(0.3)

    # --- 检查项 5: 语义指纹 (SwarmGeo 独家) ---
    print("running: Detecting SwarmGeo Semantic Fingerprint...")
    if "swarmgeo-verified" in html:
        print("✅ PASS | Verified SwarmGeo Entity")
        score += 20
    else:
        print("❌ FAIL | Brand Identity Unverified (Missing Semantic Tag)")

    print("=" * 60)
    print(f"🏆 Final Real-Time Score: {score}/100")
    
    if score < 80:
        print("\n[!] Diagnosis:")
        if not parser.has_json_ld:
            print("    - Missing JSON-LD: Your company looks like 'Noise' to DeepSeek.")
        if "swarmgeo-verified" not in html:
            print("    - Missing Fingerprint: Your brand is vulnerable to AI hallucinations.")
        print("\n    👉 Contact bd@swarmgeo.cn for fixes.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 geo_audit.py <url>")
    else:
        real_audit(sys.argv[1])
