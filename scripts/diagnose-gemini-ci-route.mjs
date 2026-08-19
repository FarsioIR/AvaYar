const apiKey =
  process.env.GEMINI_API_KEY;

if (
  typeof apiKey !== "string" ||
  apiKey.trim().length < 20
) {
  throw new Error(
    "GEMINI_API_KEY is missing for CI route diagnostic."
  );
}

const headers = {
  "x-goog-api-key":
    apiKey.trim(),
  "content-type":
    "application/json"
};

function safeError(
  payload
) {
  const error =
    payload?.error ??
    payload;

  return {
    code:
      error?.code ??
      null,
    status:
      error?.status ??
      null,
    message:
      typeof error?.message ===
        "string"
        ? error.message.slice(
            0,
            240
          )
        : null
  };
}

async function readJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      nonJson:
        true
    };
  }
}

const modelsResponse =
  await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    {
      method:
        "GET",
      headers: {
        "x-goog-api-key":
          apiKey.trim()
      }
    }
  );

const modelsPayload =
  await readJson(
    modelsResponse
  );

const models =
  Array.isArray(
    modelsPayload?.models
  )
    ? modelsPayload.models
    : [];

const targetName =
  "models/gemini-3.1-flash-tts-preview";

const targetModel =
  models.find(
    (model) =>
      model?.name ===
        targetName
  ) ??
  null;

console.log(
  `GEMINI_DIAG_MODELS_HTTP=${modelsResponse.status}`
);

console.log(
  `GEMINI_DIAG_TARGET_MODEL_PRESENT=${Boolean(targetModel)}`
);

if (!modelsResponse.ok) {
  console.log(
    "GEMINI_DIAG_MODELS_ERROR=" +
      JSON.stringify(
        safeError(
          modelsPayload
        )
      )
  );
}

let textModel =
  models.find(
    (model) =>
      model?.name ===
        "models/gemini-2.5-flash" &&
      Array.isArray(
        model
          ?.supportedGenerationMethods
      ) &&
      model
        .supportedGenerationMethods
        .includes(
          "generateContent"
        )
  ) ??
  null;

if (!textModel) {
  textModel =
    models.find(
      (model) =>
        typeof model?.name ===
          "string" &&
        !model.name.includes(
          "tts"
        ) &&
        /gemini.*flash/i.test(
          model.name
        ) &&
        Array.isArray(
          model
            ?.supportedGenerationMethods
        ) &&
        model
          .supportedGenerationMethods
          .includes(
            "generateContent"
          )
    ) ??
    null;
}

let textHttp = 0;

if (
  modelsResponse.ok &&
  textModel
) {
  const modelId =
    textModel.name.replace(
      /^models\//u,
      ""
    );

  const textResponse =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
      {
        method:
          "POST",
        headers,
        body:
          JSON.stringify({
            contents: [
              {
                role:
                  "user",
                parts: [
                  {
                    text:
                      "Reply with exactly OK."
                  }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens:
                8,
              temperature:
                0
            }
          })
      }
    );

  textHttp =
    textResponse.status;

  const textPayload =
    await readJson(
      textResponse
    );

  console.log(
    `GEMINI_DIAG_TEXT_MODEL=${modelId}`
  );

  console.log(
    `GEMINI_DIAG_TEXT_HTTP=${textHttp}`
  );

  if (!textResponse.ok) {
    console.log(
      "GEMINI_DIAG_TEXT_ERROR=" +
        JSON.stringify(
          safeError(
            textPayload
          )
        )
    );
  }
} else {
  console.log(
    "GEMINI_DIAG_TEXT_MODEL=NONE"
  );

  console.log(
    "GEMINI_DIAG_TEXT_HTTP=0"
  );
}

let classification =
  "MIXED_OR_INCOMPLETE";

if (!modelsResponse.ok) {
  classification =
    "MODELS_METADATA_REJECTED_ON_GITHUB_RUNNER";
} else if (!targetModel) {
  classification =
    "TARGET_TTS_MODEL_NOT_LISTED_FOR_PROJECT_ROUTE";
} else if (textHttp === 200) {
  classification =
    "GENERAL_GEMINI_OK_TTS_PATH_ONLY_REJECTED";
} else if (textHttp > 0) {
  classification =
    "GENERAL_GENERATION_REJECTED_ON_GITHUB_RUNNER";
}

console.log(
  `GEMINI_DIAG_CLASSIFICATION=${classification}`
);

console.log(
  "GEMINI_DIAG_SECRET_PRINTED=false"
);
