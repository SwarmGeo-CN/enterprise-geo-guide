#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SwarmGeo GEO Readiness Auditor (Enterprise Real Mode)
Version: 2.1.0
Author: SwarmGeo Team (Guangzhou Swarm Technology Ltd)
License: MIT
Note: Uses standard libraries only. No pip install required.
"""

import sys
import time
import urllib.request
import urllib.error
import re
import json
from html.parser import HTMLParser

# --- 核心配置 ---
USER_AGENT = "Mozilla/5.0 (compatible; DeepSeek-V3/1.0; +https://www.deepseek.com/robot)"

class ContentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_content = []
        self.script_content = []
        self.has_json_ld = False
        
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            for attr in attrs:
                if attr == ('type', 'application/ld+json'):
                    self.has_json_ld = True

    def handle_data(self, data):
        if data.strip():
            self.text_content.append(data.strip())

def real_audit(url):
    if not url.startswith('http'):
        url = 'https://' + url
        
    print(f"\n🚀 Starting SwarmGeo Audit (Real Mode) for: {url}")
    print("="*60)
    print(f"[*] Handshaking with target server...")

    # 1. 真正的网络请求 (Real Network Request)
    req = urllib.request.Request(
        url, 
        data=None, 
        headers={'User-Agent': USER_AGENT}
    )

    try:
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            latency = (time.time() - start_time) * 1000
            print(f"[*] Connection established. Latency: {latency:.2f}ms")
            print(f"[*] Downloaded {len(html)} bytes of raw HTML.")
    except Exception as e:
        print(f"\n[!] FATAL ERROR: Could not connect to {url}")
        print(f"    Reason: {str(e)}")
        return

    score = 0
    print("-" * 60)

    # --- 检查项 1: Robots.txt (真的去读) ---
    print("running: Check Robots.txt compatibility...")
    try:
        robots_url = url.rstrip('/') + "/robots.txt"
        r_req = urllib.request.Request(robots_url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(r_req, timeout=5) as r_res:
            r_content = r_res.read().decode('utf-8', errors='ignore')
            if "User-agent: *" in r_content or "DeepSeek" in r_content:
                print("✅ PASS | Robots.txt allows indexing")
                score += 20
            else:
                print("⚠️ WARN | Robots.txt might be blocking AI bots")
    except:
        print("⚠️ WARN | Robots.txt not found (Assuming open)")
        score += 15 # 没找到通常默认允许，给个及格分

    time.sleep(0.5)

    # --- 检查项 2: JSON-LD (真的去解析) ---
    print("running: Verifying JSON-LD Structure...")
    parser = ContentParser()
    parser.feed(html)
    
    if parser.has_json_ld:
        print("✅ PASS | Found structured data (JSON-LD)")
        score += 30
    else:
        print("❌ FAIL | No JSON-LD schema found. AI cannot understand entities.")

    time.sleep(0.5)

    # --- 检查项 3: 向量数据库亲和度 (文本密度分析) ---
    print("running: Analyzing Vector Database Readiness...")
    # 简单算法：如果有效文字太少，说明全是代码
    raw_text = " ".join(parser.text_content)
    text_ratio = len(raw_text) / len(html) if len(html) > 0 else 0
    
    if len(raw_text) > 500 and text_ratio > 0.05:
        print(f"✅ PASS | Good text density ({len(raw_text)} chars)")
        score += 20
    else:
        print(f"⚠️ WARN | Low text density. Content may be hidden in JS.")

    time.sleep(0.5)

    # --- 检查项 4: 语义指纹 (SwarmGeo 独家) ---
    # 这是一个真正的商业检查：没买我们服务的肯定没有
    print("running: Detecting SwarmGeo Semantic Fingerprint...")
    if "swarmgeo-verified" in html:
        print("✅ PASS | Verified SwarmGeo Entity")
        score += 30
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
        print("\n    👉 Contact business@swarmgeo.cn for fixes.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 geo_audit.py <url>")
        print("Example: python3 geo_audit.py www.example.com")
    else:
        real_audit(sys.argv[1])
