#!/usr/bin/env node

const apiKey = process.env.AGENT_JOB_TOKEN;
const appUrl = process.env.APP_URL;

const args = process.argv.slice(2);
const [category, subcommand, ...rest] = args;

function usage() {
  console.error('Usage:');
  console.error('  agent-job-tools secrets list');
  console.error('  agent-job-tools secrets get <key>');
  console.error('  agent-job-tools jobs create <description> [--llm-model M] [--agent-backend B] [--scope S]');
  console.error('  agent-job-tools jobs status [agent_job_id]');
  process.exit(1);
}

function requireAuth() {
  if (!apiKey) { console.error('AGENT_JOB_TOKEN not available'); process.exit(1); }
  if (!appUrl) { console.error('APP_URL not available'); process.exit(1); }
}

async function httpJson(method, path, body) {
  const url = `${appUrl}${path}`;
  const opts = { method, headers: { 'x-api-key': apiKey } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    console.error(`${method} ${url} → ${res.status} ${text}`);
    process.exit(1);
  }
  return res.json();
}

if (!category) usage();

if (category === 'secrets') {
  requireAuth();

  if (subcommand === 'list') {
    const json = await httpJson('GET', '/api/agent-job-list-secrets');
    const secrets = json.secrets;
    if (!secrets || secrets.length === 0) {
      console.log('No agent secrets configured.');
    } else {
      console.log('Available secrets:');
      secrets.forEach(s => {
        const hint = s.secretType === 'oauth2' ? '  (OAuth — use get to fetch access token)'
                   : s.secretType === 'oauth_token' ? '  (OAuth token — use get to fetch)'
                   : '';
        console.log(`  - ${s.key}${hint}`);
      });
      console.log('\nUse: agent-job-tools secrets get KEY_NAME');
      console.log('If a fetched value stops working, call get again for a fresh one.');
    }
    process.exit(0);
  }

  if (subcommand === 'get') {
    const key = rest[0];
    if (!key) { console.error('Usage: agent-job-tools secrets get KEY_NAME'); process.exit(1); }
    const json = await httpJson('GET', `/api/get-agent-job-secret?key=${encodeURIComponent(key)}`);
    console.log(json.value);
    process.exit(0);
  }

  console.error(`Unknown secrets subcommand: ${subcommand || '(none)'}`);
  usage();
}

if (category === 'jobs') {
  requireAuth();

  if (subcommand === 'create') {
    let description = null;
    const opts = {};
    let scopeExplicit = false;
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === '--llm-model') opts.llm_model = rest[++i];
      else if (arg === '--agent-backend') opts.agent_backend = rest[++i];
      else if (arg === '--scope') { opts.scope = rest[++i]; scopeExplicit = true; }
      else if (description === null) description = arg;
      else { console.error(`Unexpected arg: ${arg}`); usage(); }
    }
    if (!description) { console.error('Missing job description'); usage(); }

    if (!scopeExplicit && process.env.SCOPE) {
      opts.scope = process.env.SCOPE;
    }

    const body = { agent_job: description };
    if (opts.llm_model) body.llm_model = opts.llm_model;
    if (opts.agent_backend) body.agent_backend = opts.agent_backend;
    if (opts.scope) body.scope = opts.scope;

    const json = await httpJson('POST', '/api/create-agent-job', body);
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  }

  if (subcommand === 'status') {
    const agentJobId = rest[0];
    const qs = agentJobId ? `?agent_job_id=${encodeURIComponent(agentJobId)}` : '';
    const json = await httpJson('GET', `/api/agent-jobs/status${qs}`);
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  }

  console.error(`Unknown jobs subcommand: ${subcommand || '(none)'}`);
  usage();
}

console.error(`Unknown category: ${category}`);
usage();
