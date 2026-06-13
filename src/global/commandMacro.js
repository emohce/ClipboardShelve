import { getCommandById } from './commandDefaults.js'

export const COMMAND_MACRO_MODES = ['sequence']
export const COMMAND_MACRO_MAX_STEPS = 12
export const COMMAND_MACRO_MAX_DELAY_MS = 5000
export const COMMAND_MACRO_STEP_STATUSES = ['completed', 'failed', 'cancelled', 'skipped']

export function normalizeCommandMacroStep(step = {}) {
  const commandId = typeof step.command === 'string' ? step.command.trim() : ''
  const delayMs = Number(step.delayMs)
  return {
    command: commandId,
    delayMs: Number.isFinite(delayMs)
      ? Math.max(0, Math.min(COMMAND_MACRO_MAX_DELAY_MS, Math.round(delayMs)))
      : 0,
    args: step.args && typeof step.args === 'object' && !Array.isArray(step.args)
      ? { ...step.args }
      : {}
  }
}

export function normalizeCommandMacro(macro = {}) {
  const steps = Array.isArray(macro.steps) ? macro.steps : []
  const mode = COMMAND_MACRO_MODES.includes(macro.mode) ? macro.mode : 'sequence'
  return {
    id: typeof macro.id === 'string' ? macro.id.trim() : '',
    title: typeof macro.title === 'string' ? macro.title.trim() : '',
    shortcutId: typeof macro.shortcutId === 'string' ? macro.shortcutId.trim() : '',
    when: typeof macro.when === 'string' ? macro.when.trim() : 'mainFocus',
    mode,
    steps: steps.slice(0, COMMAND_MACRO_MAX_STEPS).map(normalizeCommandMacroStep)
  }
}

export function validateCommandMacro(macro = {}, options = {}) {
  const {
    getCommand = getCommandById,
    allowDataWrite = false
  } = options
  const normalized = normalizeCommandMacro(macro)
  const errors = []
  if (!normalized.id) errors.push({ field: 'id', message: 'Macro id is required' })
  if (!normalized.id.startsWith('macro.')) {
    errors.push({ field: 'id', message: 'Macro id must start with macro.' })
  }
  if (!COMMAND_MACRO_MODES.includes(normalized.mode)) {
    errors.push({ field: 'mode', message: 'Unsupported macro mode' })
  }
  if (!normalized.steps.length) {
    errors.push({ field: 'steps', message: 'Macro must contain at least one step' })
  }
  normalized.steps.forEach((step, index) => {
    const field = `steps.${index}.command`
    if (!step.command) {
      errors.push({ field, message: 'Step command is required' })
      return
    }
    const command = getCommand(step.command)
    if (!command) {
      errors.push({ field, message: `Unknown command: ${step.command}` })
      return
    }
    if (!allowDataWrite && command.risk === 'data-write') {
      errors.push({ field, message: `Data-write command is not allowed in macro: ${step.command}` })
    }
  })
  return {
    ok: errors.length === 0,
    errors,
    macro: normalized
  }
}

export function buildCommandMacroCommand(macro = {}, options = {}) {
  const result = validateCommandMacro(macro, options)
  if (!result.ok) return result
  return {
    ...result,
    command: {
      id: result.macro.id,
      title: result.macro.title || result.macro.id,
      category: 'macro',
      description: `${result.macro.steps.length} step command macro`,
      risk: 'macro',
      source: 'user',
      macro: result.macro
    }
  }
}

export function buildCommandMacroPlan(macro = {}, options = {}) {
  const {
    getCommand = getCommandById,
    allowDataWrite = false
  } = options
  const result = validateCommandMacro(macro, { getCommand, allowDataWrite })
  if (!result.ok) return result

  let elapsedMs = 0
  const steps = result.macro.steps.map((step, index) => {
    elapsedMs += step.delayMs
    const command = getCommand(step.command)
    return {
      index,
      commandId: step.command,
      title: command?.title || step.command,
      risk: command?.risk || 'normal',
      delayMs: step.delayMs,
      settleAfterMs: Number.isFinite(Number(command?.macroSettleAfterMs))
        ? Math.max(0, Math.round(Number(command.macroSettleAfterMs)))
        : 0,
      elapsedMs,
      args: { ...step.args }
    }
  })
  const risks = [...new Set(steps.map((step) => step.risk).filter(Boolean))]
  return {
    ...result,
    plan: {
      id: result.macro.id,
      mode: result.macro.mode,
      totalDelayMs: elapsedMs,
      hasDataWrite: risks.includes('data-write'),
      risks,
      steps
    }
  }
}

export function validateCommandMacroPlanExecutable(planResult = {}, options = {}) {
  const {
    hasCommandHandler = () => false
  } = options
  const plan = planResult.plan || planResult
  const steps = Array.isArray(plan?.steps) ? plan.steps : []
  const errors = []
  if (!plan?.id) errors.push({ field: 'plan.id', message: 'Macro plan id is required' })
  steps.forEach((step, index) => {
    if (!hasCommandHandler(step.commandId)) {
      errors.push({
        field: `steps.${index}.commandId`,
        message: `Command handler is not registered: ${step.commandId}`
      })
    }
  })
  if (!steps.length) errors.push({ field: 'steps', message: 'Macro plan must contain at least one step' })
  return {
    ok: errors.length === 0,
    errors,
    plan
  }
}

export function buildCommandMacroDryRun(planResult = {}, options = {}) {
  const {
    hasCommandHandler = () => false,
    startAtMs = 0
  } = options
  const executable = validateCommandMacroPlanExecutable(planResult, { hasCommandHandler })
  const missingFields = new Set(executable.errors.map((error) => error.field))
  const steps = (Array.isArray(executable.plan?.steps) ? executable.plan.steps : []).map((step, index) => {
    const blocked = missingFields.has(`steps.${index}.commandId`)
    return {
      index,
      commandId: step.commandId,
      title: step.title,
      risk: step.risk,
      args: { ...(step.args || {}) },
      delayMs: step.delayMs,
      scheduledAtMs: startAtMs + step.elapsedMs,
      status: blocked ? 'blocked' : 'scheduled',
      reason: blocked ? 'missing-handler' : ''
    }
  })
  return {
    ok: executable.ok,
    errors: executable.errors,
    dryRun: {
      id: executable.plan?.id || '',
      mode: executable.plan?.mode || 'sequence',
      startAtMs,
      totalDelayMs: executable.plan?.totalDelayMs || 0,
      hasDataWrite: executable.plan?.hasDataWrite === true,
      risks: Array.isArray(executable.plan?.risks) ? executable.plan.risks.slice() : [],
      steps
    }
  }
}

export function normalizeCommandMacroStepResult(stepResult = {}) {
  const status = COMMAND_MACRO_STEP_STATUSES.includes(stepResult.status)
    ? stepResult.status
    : 'completed'
  return {
    index: Number.isInteger(stepResult.index) ? stepResult.index : 0,
    commandId: typeof stepResult.commandId === 'string' ? stepResult.commandId : '',
    status,
    handled: stepResult.handled === true,
    error: stepResult.error ? String(stepResult.error) : '',
    startedAtMs: Number.isFinite(Number(stepResult.startedAtMs)) ? Number(stepResult.startedAtMs) : 0,
    endedAtMs: Number.isFinite(Number(stepResult.endedAtMs)) ? Number(stepResult.endedAtMs) : 0
  }
}

export function buildCommandMacroRunResult(planResult = {}, stepResults = []) {
  const plan = planResult.plan || planResult
  const normalizedStepResults = (Array.isArray(stepResults) ? stepResults : []).map(normalizeCommandMacroStepResult)
  const failedStep = normalizedStepResults.find((step) => step.status === 'failed')
  const cancelledStep = normalizedStepResults.find((step) => step.status === 'cancelled')
  const status = failedStep ? 'failed' : cancelledStep ? 'cancelled' : 'completed'
  const startedAtMs = normalizedStepResults.length
    ? Math.min(...normalizedStepResults.map((step) => step.startedAtMs))
    : 0
  const endedAtMs = normalizedStepResults.length
    ? Math.max(...normalizedStepResults.map((step) => step.endedAtMs))
    : 0
  return {
    id: plan?.id || '',
    status,
    handled: normalizedStepResults.some((step) => step.handled),
    failedAt: failedStep?.index ?? -1,
    cancelledAt: cancelledStep?.index ?? -1,
    startedAtMs,
    endedAtMs,
    durationMs: Math.max(0, endedAtMs - startedAtMs),
    steps: normalizedStepResults
  }
}

export async function executeCommandMacroPlan(planResult = {}, options = {}) {
  const {
    hasCommandHandler = () => false,
    runCommand,
    wait = () => Promise.resolve(),
    now = () => Date.now(),
    shouldCancel = () => false,
    onStepStart = () => {},
    onStepEnd = () => {}
  } = options
  const executable = validateCommandMacroPlanExecutable(planResult, { hasCommandHandler })
  const plan = executable.plan
  const stepResults = []
  if (!executable.ok) {
    const missingFields = new Set(executable.errors.map((error) => error.field))
    const steps = Array.isArray(plan?.steps) ? plan.steps : []
    steps.forEach((step, index) => {
      const missingHandler = missingFields.has(`steps.${index}.commandId`)
      stepResults.push({
        index,
        commandId: step.commandId,
        status: missingHandler ? 'failed' : 'skipped',
        error: missingHandler ? 'missing-handler' : '',
        startedAtMs: 0,
        endedAtMs: 0
      })
    })
    return {
      ok: false,
      errors: executable.errors,
      result: buildCommandMacroRunResult(plan, stepResults)
    }
  }
  if (typeof runCommand !== 'function') {
    return {
      ok: false,
      errors: [{ field: 'runCommand', message: 'runCommand function is required' }],
      result: buildCommandMacroRunResult(plan, [])
    }
  }

  for (const step of plan.steps) {
    if (shouldCancel(step)) {
      stepResults.push({
        index: step.index,
        commandId: step.commandId,
        status: 'cancelled',
        error: 'cancelled',
        startedAtMs: now(),
        endedAtMs: now()
      })
      break
    }
    if (step.delayMs > 0) await wait(step.delayMs, step, 'delay')
    if (shouldCancel(step)) {
      stepResults.push({
        index: step.index,
        commandId: step.commandId,
        status: 'cancelled',
        error: 'cancelled',
        startedAtMs: now(),
        endedAtMs: now()
      })
      break
    }
    const startedAtMs = now()
    try {
      onStepStart(step)
      const outcome = await runCommand(step.commandId, { ...step.args }, step)
      const endedAtMs = now()
      const status = COMMAND_MACRO_STEP_STATUSES.includes(outcome?.status)
        ? outcome.status
        : 'completed'
      const stepResult = {
        index: step.index,
        commandId: step.commandId,
        status,
        handled: outcome?.handled === true,
        error: outcome?.error || '',
        startedAtMs,
        endedAtMs
      }
      stepResults.push(stepResult)
      onStepEnd(stepResult, step)
      if (status === 'failed' || status === 'cancelled') break
      if (step.settleAfterMs > 0) await wait(step.settleAfterMs, step, 'settle')
    } catch (err) {
      const stepResult = {
        index: step.index,
        commandId: step.commandId,
        status: 'failed',
        handled: false,
        error: err?.message || err,
        startedAtMs,
        endedAtMs: now()
      }
      stepResults.push(stepResult)
      onStepEnd(stepResult, step)
      break
    }
  }

  const executedIndexes = new Set(stepResults.map((step) => step.index))
  for (const step of plan.steps) {
    if (!executedIndexes.has(step.index)) {
      stepResults.push({
        index: step.index,
        commandId: step.commandId,
        status: 'skipped',
        startedAtMs: 0,
        endedAtMs: 0
      })
    }
  }

  const result = buildCommandMacroRunResult(plan, stepResults.sort((a, b) => a.index - b.index))
  return {
    ok: result.status === 'completed',
    errors: result.status === 'completed' ? [] : [{ field: 'steps', message: `Macro ${result.status}` }],
    result
  }
}
