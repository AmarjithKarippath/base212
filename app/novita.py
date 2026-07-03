from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.config import settings
from app.schemas import ChatCompletionRequest, ChatRequest


def get_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=settings.novita_base_url,
        api_key=settings.novita_api_key,
    )


def build_completion_kwargs(request: ChatCompletionRequest) -> dict:
    return {
        "model": request.model or settings.default_model,
        "messages": [message.model_dump() for message in request.messages],
        "stream": request.stream,
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "top_p": request.top_p,
        "presence_penalty": request.presence_penalty,
        "frequency_penalty": request.frequency_penalty,
        "response_format": request.response_format,
        "extra_body": {
            "top_k": request.top_k,
            "repetition_penalty": request.repetition_penalty,
            "min_p": request.min_p,
        },
    }


async def create_chat_completion(request: ChatCompletionRequest):
    client = get_async_client()
    return await client.chat.completions.create(**build_completion_kwargs(request))


def chat_request_to_completion(
    request: ChatRequest,
    system_prompt: str,
) -> ChatCompletionRequest:
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
    ]
    for item in request.history:
        messages.append(item.model_dump())
    messages.append({"role": "user", "content": request.message})

    return ChatCompletionRequest(
        messages=messages,
        model=request.model,
        stream=False,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        top_p=request.top_p,
        min_p=request.min_p,
        top_k=request.top_k,
        presence_penalty=request.presence_penalty,
        frequency_penalty=request.frequency_penalty,
        repetition_penalty=request.repetition_penalty,
    )


async def create_chat(request: ChatRequest, system_prompt: str):
    return await create_chat_completion(
        chat_request_to_completion(request, system_prompt)
    )


async def iter_stream_chunks(completion) -> AsyncIterator[str]:
    async for chunk in completion:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
