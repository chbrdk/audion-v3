"""Beta Browser Use integration."""

from __future__ import annotations

from typing import TYPE_CHECKING

from audion_agent.beta.service import Agent, BetaAgentError, find_audion_agent_terminal_binary

if TYPE_CHECKING:
	from audion_agent.browser import BrowserProfile, BrowserSession
	from audion_agent.browser import BrowserSession as Browser
	from audion_agent.llm.anthropic.chat import ChatAnthropic
	from audion_agent.llm.azure.chat import ChatAzureOpenAI
	from audion_agent.llm.audion_agent.chat import ChatBrowserUse
	from audion_agent.llm.google.chat import ChatGoogle
	from audion_agent.llm.groq.chat import ChatGroq
	from audion_agent.llm.litellm.chat import ChatLiteLLM
	from audion_agent.llm.mistral.chat import ChatMistral
	from audion_agent.llm.oci_raw.chat import ChatOCIRaw
	from audion_agent.llm.ollama.chat import ChatOllama
	from audion_agent.llm.openai.chat import ChatOpenAI
	from audion_agent.llm.vercel.chat import ChatVercel

_LAZY_IMPORTS = {
	'Browser': ('audion_agent.browser', 'BrowserSession'),
	'BrowserProfile': ('audion_agent.browser', 'BrowserProfile'),
	'BrowserSession': ('audion_agent.browser', 'BrowserSession'),
	'ChatOpenAI': ('audion_agent.llm.openai.chat', 'ChatOpenAI'),
	'ChatGoogle': ('audion_agent.llm.google.chat', 'ChatGoogle'),
	'ChatAnthropic': ('audion_agent.llm.anthropic.chat', 'ChatAnthropic'),
	'ChatBrowserUse': ('audion_agent.llm.audion_agent.chat', 'ChatBrowserUse'),
	'ChatGroq': ('audion_agent.llm.groq.chat', 'ChatGroq'),
	'ChatLiteLLM': ('audion_agent.llm.litellm.chat', 'ChatLiteLLM'),
	'ChatMistral': ('audion_agent.llm.mistral.chat', 'ChatMistral'),
	'ChatAzureOpenAI': ('audion_agent.llm.azure.chat', 'ChatAzureOpenAI'),
	'ChatOCIRaw': ('audion_agent.llm.oci_raw.chat', 'ChatOCIRaw'),
	'ChatOllama': ('audion_agent.llm.ollama.chat', 'ChatOllama'),
	'ChatVercel': ('audion_agent.llm.vercel.chat', 'ChatVercel'),
}


def __getattr__(name: str):
	if name in _LAZY_IMPORTS:
		module_path, attr_name = _LAZY_IMPORTS[name]
		from importlib import import_module

		module = import_module(module_path)
		attr = getattr(module, attr_name)
		globals()[name] = attr
		return attr
	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


__all__ = [
	'Agent',
	'BetaAgentError',
	'Browser',
	'BrowserProfile',
	'BrowserSession',
	'ChatAnthropic',
	'ChatAzureOpenAI',
	'ChatBrowserUse',
	'ChatGoogle',
	'ChatGroq',
	'ChatLiteLLM',
	'ChatMistral',
	'ChatOCIRaw',
	'ChatOllama',
	'ChatOpenAI',
	'ChatVercel',
	'find_audion_agent_terminal_binary',
]
