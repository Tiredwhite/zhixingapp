class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, retryable: bool = False):
        self.status = status
        self.code = code
        self.message = message
        self.retryable = retryable


class InvalidModelOutput(Exception):
    def __init__(self, hint='JSON结构或原文依据无效'):
        self.hint = hint
        super().__init__(hint)

