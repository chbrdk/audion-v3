"""Agent package exports."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
	from audion_agent.agent.service import Agent
	from audion_agent.beta.service import BetaAgentError

_LAZY_IMPORTS = {
	'Agent': ('audion_agent.agent.service', 'Agent'),
	'BetaAgentError': ('audion_agent.beta.service', 'BetaAgentError'),
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
]
