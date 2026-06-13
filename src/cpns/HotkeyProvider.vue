<template>
  <slot></slot>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  dispatch,
  hasCommandHandler,
  registerCommand,
  runRegisteredCommand,
  setBindings,
  unregisterCommand
} from '../global/hotkeyRegistry'
import {
  HOTKEY_BINDINGS_UPDATED_EVENT,
  HOTKEY_BINDINGS_VERSION
} from '../global/hotkeyBindings'
import { getEffectiveShortcutBindings } from '../global/shortcutStore'
import {
  COMMAND_MACROS_UPDATED_EVENT,
  getEffectiveCommandMacros
} from '../global/commandMacroStore'
import { buildCommandMacroPlan, executeCommandMacroPlan } from '../global/commandMacro'
import {
  getCommandMacroRuntimeState,
  isCommandMacroCancelRequested,
  requestCancelCommandMacroRun,
  setCommandMacroRuntimeState
} from '../global/commandMacroRuntime'

let registeredMacroCommandIds = []

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function keydownHandler(e) {
  dispatch(e)
}

function refreshBindings() {
  registeredMacroCommandIds.forEach((commandId) => unregisterCommand(commandId))
  registeredMacroCommandIds = []
  const macroBindings = []
  const { macros } = getEffectiveCommandMacros({ warn: () => {} })
  macros.forEach((macro) => {
    if (!macro?.id || !macro?.shortcutId) return
    const planResult = buildCommandMacroPlan(macro)
    if (!planResult.ok) return
    registerCommand(macro.id, async (event, ctx) => {
      const currentState = getCommandMacroRuntimeState(macro.id)
      if (currentState?.status === 'running' || currentState?.status === 'cancelling') {
        requestCancelCommandMacroRun(macro.id)
        ElMessage.warning(`正在取消组合命令：${macro.title || macro.id}`)
        return {
          handled: true,
          preventDefault: true,
          stopPropagation: true
        }
      }
      const runId = `${macro.id}:${Date.now()}`
      setCommandMacroRuntimeState(macro.id, {
        runId,
        title: macro.title || macro.id,
        status: 'running',
        currentStep: -1,
        totalSteps: planResult.plan?.steps?.length || 0,
        cancelRequested: false,
        error: ''
      })
      ElMessage.info(`执行组合命令：${macro.title || macro.id}`)
      const result = await executeCommandMacroPlan(planResult, {
        hasCommandHandler,
        wait,
        shouldCancel: () => isCommandMacroCancelRequested(macro.id, runId),
        onStepStart: (step) => setCommandMacroRuntimeState(macro.id, {
          runId,
          status: 'running',
          currentStep: step.index,
          totalSteps: planResult.plan?.steps?.length || 0
        }),
        onStepEnd: (stepResult) => setCommandMacroRuntimeState(macro.id, {
          runId,
          status: stepResult.status === 'completed' ? 'running' : stepResult.status,
          currentStep: stepResult.index,
          error: stepResult.error || ''
        }),
        runCommand: (commandId, args, step) => runRegisteredCommand(commandId, args, {
          ...ctx,
          event,
          macroId: macro.id,
          macroStep: step
        })
      })
      if (!result.ok) {
        const isCancelled = result.result?.status === 'cancelled'
        setCommandMacroRuntimeState(macro.id, {
          runId,
          status: isCancelled ? 'cancelled' : 'failed',
          currentStep: result.result?.cancelledAt >= 0 ? result.result.cancelledAt : result.result?.failedAt ?? -1,
          error: result.errors?.[0]?.message || ''
        })
        ElMessage[isCancelled ? 'warning' : 'error'](
          `${isCancelled ? '组合命令已取消' : '组合命令执行失败'}：${macro.title || macro.id}`
        )
        console.warn('[EzClipboard] command macro execution failed', result)
      } else {
        setCommandMacroRuntimeState(macro.id, {
          runId,
          status: 'completed',
          currentStep: planResult.plan?.steps?.length ? planResult.plan.steps.length - 1 : -1,
          error: ''
        })
        ElMessage.success(`组合命令已执行：${macro.title || macro.id}`)
      }
      return {
        handled: result.result?.handled !== false,
        preventDefault: true,
        stopPropagation: true
      }
    })
    registeredMacroCommandIds.push(macro.id)
    macroBindings.push({
      layer: 'main',
      shortcutId: macro.shortcutId,
      commands: [macro.id],
      features: [],
      when: macro.when || 'mainFocus',
      defaultWhen: macro.when || 'mainFocus',
      source: 'user',
      weight: 200
    })
  })
  setBindings([...getEffectiveShortcutBindings(), ...macroBindings], HOTKEY_BINDINGS_VERSION)
}

onMounted(() => {
  refreshBindings()
  document.addEventListener('keydown', keydownHandler, true)
  window.addEventListener('focus', refreshBindings)
  window.addEventListener(HOTKEY_BINDINGS_UPDATED_EVENT, refreshBindings)
  window.addEventListener(COMMAND_MACROS_UPDATED_EVENT, refreshBindings)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keydownHandler, true)
  window.removeEventListener('focus', refreshBindings)
  window.removeEventListener(HOTKEY_BINDINGS_UPDATED_EVENT, refreshBindings)
  window.removeEventListener(COMMAND_MACROS_UPDATED_EVENT, refreshBindings)
  registeredMacroCommandIds.forEach((commandId) => unregisterCommand(commandId))
  registeredMacroCommandIds = []
})

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    refreshBindings()
  })
}
</script>
