import JSZip from 'jszip'
import { extractIsfMetadata, adaptIsfToFx } from '../fx/isfAdapter.js'
import { registerIsfEffect } from '../fx/effects.js'

export async function exportStk(project) {
  const zip = new JSZip()
  const projectJson = {
    version: 2,
    projectName: project.projectName || 'untitled',
    tabs: project.tabs.map(t => ({ name: t.name, code: t.code })),
    fxChain: project.fxChain || [],
    ccValues: project.ccValues || {},
    ccMapping: project.ccMapping || {},
    console: project.console || {},
    audio: project.audio || {},
  }
  zip.file('project.json', JSON.stringify(projectJson, null, 2))
  for (const tab of project.tabs) {
    zip.file(tab.name, tab.code)
  }
  return await zip.generateAsync({ type: 'blob' })
}

export async function importStk(blob) {
  const zip = await JSZip.loadAsync(blob)
  const projectJsonFile = zip.file('project.json')
  if (!projectJsonFile) {
    throw new Error('Invalid .stk file: missing project.json')
  }
  const projectJson = JSON.parse(await projectJsonFile.async('text'))
  const tabs = []
  for (const tabInfo of projectJson.tabs || []) {
    const file = zip.file(tabInfo.name)
    if (file) {
      tabs.push({
        id: Date.now() + Math.random(),
        name: tabInfo.name,
        code: await file.async('text'),
        modified: false,
      })
    }
  }
  const fxChain = projectJson.fxChain || []

  // Re-register ISF effects from isfSource fields
  for (const fx of fxChain) {
    if (fx.isfSource && fx.isIsf) {
      const metadata = extractIsfMetadata(fx.isfSource)
      if (metadata) {
        const { shader, params } = adaptIsfToFx(fx.isfSource, metadata)
        registerIsfEffect(fx.id, {
          id: fx.id,
          label: fx.label,
          category: fx.category || 'ISF',
          isIsf: true,
          source: fx.isfSource,
          params,
          shader,
        })
      }
    }
  }

  return {
    projectName: projectJson.projectName || 'untitled',
    tabs,
    fxChain,
    ccValues: projectJson.ccValues || null,
    ccMapping: projectJson.ccMapping || null,
    console: projectJson.console || null,
    audio: projectJson.audio || null,
  }
}


