// Dependency-free checks for the GitHub Actions configuration. CI is the only
// place the complete suite runs, so these invariants must fail locally too.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {repo,report} from './browser.mjs';

const result={checks:[],passed:false};
const check=name=>{result.checks.push(name);console.log(name);};
const read=file=>readFile(path.join(repo,file),'utf8');

try{
 const [ci,pages,packageSource]=await Promise.all([
  read('.github/workflows/ci.yml'),
  read('.github/workflows/pages.yml'),
  read('package.json'),
 ]);
 const manifest=JSON.parse(packageSource),testScript=manifest.scripts?.test||'';

 // CI is the reusable test entry point; pages.yml owns main pushes and publication.
 assert.match(ci,/^name: CI$/m);
 assert.match(ci,/^on:\s*$/m);
 for(const trigger of ['pull_request','workflow_dispatch','workflow_call'])assert.match(ci,new RegExp(`^  ${trigger}:\\s*$`,'m'),`CI must run on ${trigger}`);
 assert.doesNotMatch(ci,/^  push:\s*$/m,'Main pushes are tested through the reusable workflow in pages.yml');
 assert.doesNotMatch(ci,/pull_request_target/,'pull_request_target would expose repository write access to fork code');
 assert.match(ci,/^permissions:\n  contents: read$/m,'CI must keep the repository token read-only');
 assert.doesNotMatch(ci,/(?:contents|pages|id-token): write/,'CI must not be able to publish');
 assert.match(ci,/^concurrency:\n  group: ci-\$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}\n  cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}$/m,'Superseded pull-request runs must be cancelled');
 check('CI runs on pull requests, manual dispatch and reusable calls with read-only access');

 assert.equal(manifest.engines?.node,'>=22','The declared Node support floor changed');
 const matrix=ci.match(/matrix:\n\s+node: \[([^\]]+)\]/)?.[1];
 assert.ok(matrix,'CI must define an explicit Node matrix');
 const nodeVersions=matrix.split(',').map(value=>value.trim().replace(/^['"]|['"]$/g,'')).sort();
 assert.deepEqual(nodeVersions,['22','24'],'CI must test the declared floor and the current release');
 assert.match(ci,/fetch-depth: 0/,'Historical fixtures are read from Git, so CI needs full history');
 assert.match(ci,/runs-on: ubuntu-24\.04/);
 check('CI tests Node 22 and 24 with full history');

 assert.match(ci,/run: npm ci/);
 assert.match(ci,/run: npm test/,'CI must run the documented entry point');
 assert.doesNotMatch(ci,/run: node tests\//,'Do not duplicate the suite list in the workflow');
 assert.match(ci,/command -v google-chrome/);
 assert.match(ci,/test -n "\$chrome_binary"/);
 assert.match(ci,/CHROMIUM=\$chrome_binary/,'The browser harness must receive the installed Chrome path');
 assert.match(ci,/name: regression-results-node-\$\{\{ matrix\.node \}\}/);
 assert.match(ci,/path: \/tmp\/reference-regression-results\//);
 assert.match(ci,/if: always\(\)/,'Regression artifacts must survive failures');
 assert.match(ci,/fail-fast: false/,'Both supported Node versions must report a result');
 check('CI runs npm test against the harness Chrome and uploads results');

 const suites=(await readdir(path.join(repo,'tests'))).filter(name=>name.endsWith('.mjs')&&!['browser.mjs','workflows.mjs'].includes(name)).sort();
 assert.ok(suites.length>=15,'The suite list is unexpectedly short');
 for(const suite of suites){
  const command=suite==='worker-storage.mjs'?`node --test tests/${suite}`:`node tests/${suite}`;
  assert.ok(testScript.includes(command),`${command} is missing from npm test`);
 }
 assert.match(testScript,/npm run typecheck/);
 assert.match(testScript,/node scripts\/build\.mjs/);
 assert.match(testScript,/node tests\/workflows\.mjs/,'This workflow check must run in npm test');
 check(`npm test still runs all ${suites.length} browser and Node suites plus this check`);

 assert.match(pages,/^on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:$/m);
 assert.doesNotMatch(pages,/^  pull_request:/m,'Pull requests are tested by ci.yml, not by the publishing workflow');
 assert.match(pages,/jobs:\n  test:\n    uses: \.\/\.github\/workflows\/ci\.yml/,'Deployment must call the reusable CI workflow');
 assert.match(pages,/  publish:\n    if: github\.ref == 'refs\/heads\/main'\n    needs: test/);
 assert.match(pages,/    permissions:\n      contents: write\n      pages: write/,'Publishing still needs its documented write permissions');
 assert.doesNotMatch(pages,/node tests\//,'Deployment must not maintain a second suite list');
 assert.doesNotMatch(pages,/npm test/,'Deployment gets its test gate from the reusable workflow');
 check('Main publishing delegates testing to CI and keeps its narrow write permissions');

 for(const [label,workflow] of [['ci.yml',ci],['pages.yml',pages]]){
  assert.doesNotMatch(workflow,/\t/,'Workflow files must not contain tab indentation');
  for(const match of workflow.matchAll(/^\s*(?:- )?uses: (\S+)$/gm)){
   const action=match[1];
   if(action.startsWith('./')||action.startsWith('docker://'))continue;
   assert.match(action,/@(?:v\d+|[0-9a-f]{40})$/,'Action must be pinned to a version or commit: '+action);
  }
 }
 check('Workflow actions are versioned and files use space indentation');

 result.passed=true;
}catch(error){result.error=error.stack;process.exitCode=1;}
finally{await report('workflows',result);}
