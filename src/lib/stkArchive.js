import JSZip from 'jszip'

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
  return {
    projectName: projectJson.projectName || 'untitled',
    tabs,
    fxChain: projectJson.fxChain || [],
    ccValues: projectJson.ccValues || null,
    ccMapping: projectJson.ccMapping || null,
    console: projectJson.console || null,
    audio: projectJson.audio || null,
  }
}
