#!/usr/bin/env node
/**
 * SynSwarm Level 2 fingerprint signing CLI
 * Usage:
 *   node tools/sign-fingerprint.mjs --entity ORG_ID --domain example.com --content page.html --key private.pem
 *   node tools/sign-fingerprint.mjs --gen-keypair
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateEd25519KeyPair, readKeyFile, signLevel2Fingerprint } from '../packages/core-edge/dist/sss/signature.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[i + 1];
    args[name] = value ?? true;
    if (value && !value.startsWith('--')) i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);

if (args['gen-keypair']) {
  const pair = generateEd25519KeyPair();
  if (args.out) {
    writeFileSync(`${args.out}.private.pem`, pair.privateKey);
    writeFileSync(`${args.out}.public.pem`, pair.publicKey);
    console.log(`Wrote ${args.out}.private.pem and ${args.out}.public.pem`);
  } else {
    console.log(JSON.stringify(pair, null, 2));
  }
  process.exit(0);
}

const entityId = args.entity;
const domain = args.domain;
const contentPath = args.content;
const keyPath = args.key;

if (!entityId || !domain || !contentPath || !keyPath) {
  console.error(`Usage:
  node tools/sign-fingerprint.mjs --gen-keypair [--out keyname]
  node tools/sign-fingerprint.mjs --entity ORG_ID --domain example.com --content page.html --key private.pem`);
  process.exit(1);
}

const content = readFileSync(contentPath, 'utf8');
const privateKeyPem = readKeyFile(keyPath);
const result = signLevel2Fingerprint({
  entityId,
  domain,
  content,
  privateKeyPem,
});

console.log(JSON.stringify(result, null, 2));
