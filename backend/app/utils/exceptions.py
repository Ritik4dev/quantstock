from fastapi import HTTPException, status


class UserAlreadyExistsException(HTTPException):
    def __init__(self, message: str = "A user with this email address already exists."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


class InvalidCredentialsException(HTTPException):
    def __init__(self, message: str = "Invalid email or password."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )


class UnauthorizedException(HTTPException):
    def __init__(self, message: str = "Could not validate credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )


class BusinessNotFoundException(HTTPException):
    def __init__(self, message: str = "Requested business was not found."):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message
        )


class BusinessAccessDeniedException(HTTPException):
    def __init__(self, message: str = "You do not have permission to access or modify this business."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )


class LLMProcessingException(HTTPException):
    def __init__(self, message: str = "Failed to process request using LLM. Please try again."):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message
        )

OpenAIProcessingException = LLMProcessingException


class DatabaseException(HTTPException):
    def __init__(self, message: str = "A database operation failed."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=message
        )
