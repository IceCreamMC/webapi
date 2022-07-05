import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import semver from 'semver';
import { fetch } from 'undici';

const projects = JSON.parse(readFileSync(join(__dirname, '..', '..', 'projects.json'), 'utf8'));
const router = Router();

router.get('/', (req, res) => {
    res.json({
        projects: Object.keys(projects)
    })
})

router.get('/:project/version_group/:versiongroup/builds', async(req, res) => {
    const projectName = req.params.project as string;
    const versiongroup = req.params.versiongroup as string;
    if (!versiongroup || !projectName) {
        res.status(400).json({
            error: 'Missing parameters'
        })
        return;
    }

    const buildIds = (await (await fetch('https://jenkins.cezarsalat.tk/job/Sharkur/job/ver%252F'+versiongroup+'/wfapi/runs/')).json() as unknown as any[]).map(run => run.id);
    const builds = [];

    for (const buildId of buildIds) {
        const build = await (await fetch('http://localhost:8989/api/v2/projects/'+projectName+'/version_group/'+versiongroup+'/builds/'+buildId)).json() as any;
        if (build.result !== 'SUCCESS' || !build.downloads.application.name) continue;
        builds.push(build);
    }

    const project = projects[projectName];
    res.json({
        'project-id': project['project-id'],
        'project-name': project['project-name'],
        'version_group': versiongroup,
        'versions': project['versions'].filter(version => semver.satisfies(version, versiongroup) || version == versiongroup),
        builds: builds
    })
})

router.get('/:project/version_group/:versiongroup/builds/:buildid', async(req, res) => {
    const versiongroup = req.params.versiongroup as string;
    const buildId = req.params.buildid as string;
    if (!versiongroup || !buildId) {
        res.status(400).json({
            error: 'Missing parameters'
        })
        return;
    }

    const build = await (await fetch('https://jenkins.cezarsalat.tk/job/Sharkur/job/ver%252F'+versiongroup+'/'+buildId+'/api/json?pretty=true')).json() as any;

    res.json({
        version: versiongroup,
        build: parseInt(build.id),
        time: new Date(build.timestamp).toISOString(),
        channel: 'default',
        result: build.result,
        promoted: false,
        changes: build.changeSets?.[0]?.items?.map(change => new Object({
            commit: change.commitId,
            summary: change.msg,
            message: change.comment,
        })) || null,
        downloads: {
            application: {
                name: build.artifacts?.[0]?.fileName ?? null,
                sha256: null,
            }
        }
    })
})

router.get('/:project/versions/:version/builds/:buildid/downloads/:name', async(req, res) => {
    const version = req.params.version as string;
    const buildId = req.params.buildid as string;
    const name = req.params.name as string;
    if (!version || !buildId || !name) {
        res.status(400).json({
            error: 'Missing parameters'
        })
        return;
    }

    res.redirect('https://jenkins.cezarsalat.tk/job/Sharkur/job/ver%252F'+version+'/'+buildId+'/artifact/build/libs/'+name);
})

export default router;
