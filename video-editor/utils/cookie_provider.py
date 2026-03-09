import os
from abc import ABC, abstractmethod

class BaseCookieProvider(ABC):
    @abstractmethod
    def get_cookie_path(self) -> str | None:
        pass

class EnvCookieProvider(BaseCookieProvider):
    def __init__(self, env_variable_name: str):
        self._env_variable_name = env_variable_name

    def get_cookie_path(self) -> str | None:
        return os.getenv(self._env_variable_name)

class DockerSecretCookieProvider(BaseCookieProvider):
    def __init__(self, secret_name: str):
        self._secret_path = f'/run/secrets/{secret_name}'

    def get_cookie_path(self) -> str | None:
        return self._secret_path if os.path.exists(self._secret_path) else None
