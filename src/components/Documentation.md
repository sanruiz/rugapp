<br />

The Gemini Batch API is designed to process large volumes of requests asynchronously at[50% of the standard cost](https://ai.google.dev/gemini-api/docs/pricing). The target turnaround time is 24 hours, but in majority of cases, it is much quicker.

Use Batch API for large-scale, non-urgent tasks such as data pre-processing or running evaluations where an immediate response is not required.

## Creating a batch job

You have two ways to submit your requests in Batch API:

- **[Inline requests](https://ai.google.dev/gemini-api/docs/batch-api#inline-requests):** A list of[`GenerateContentRequest`](https://ai.google.dev/api/batch-mode#GenerateContentRequest)objects directly included in your batch creation request. This is suitable for smaller batches that keep the total request size under 20MB. The**output** returned from the model is a list of`inlineResponse`objects.
- **[Input file](https://ai.google.dev/gemini-api/docs/batch-api#input-file):** A[JSON Lines (JSONL)](https://jsonlines.org/)file where each line contains a complete[`GenerateContentRequest`](https://ai.google.dev/api/batch-mode#GenerateContentRequest)object. This method is recommended for larger requests. The**output** returned from the model is a JSONL file where each line is either a`GenerateContentResponse`or a status object.

### Inline requests

For a small number of requests, you can directly embed the[`GenerateContentRequest`](https://ai.google.dev/api/batch-mode#GenerateContentRequest)objects within your[`BatchGenerateContentRequest`](https://ai.google.dev/api/batch-mode#request-body). The following example calls the[`BatchGenerateContent`](https://ai.google.dev/api/batch-mode#google.ai.generativelanguage.v1beta.BatchService.BatchGenerateContent)method with inline requests:  

### Python


    from google import genai
    from google.genai import types

    client = genai.Client()

    # A list of dictionaries, where each is a GenerateContentRequest
    inline_requests = [
        {
            'contents': [{
                'parts': [{'text': 'Tell me a one-sentence joke.'}],
                'role': 'user'
            }]
        },
        {
            'contents': [{
                'parts': [{'text': 'Why is the sky blue?'}],
                'role': 'user'
            }]
        }
    ]

    inline_batch_job = client.batches.create(
        model="models/gemini-2.5-flash",
        src=inline_requests,
        config={
            'display_name': "inlined-requests-job-1",
        },
    )

    print(f"Created batch job: {inline_batch_job.name}")

### JavaScript


    import {GoogleGenAI} from '@google/genai';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

    const inlinedRequests = [
        {
            contents: [{
                parts: [{text: 'Tell me a one-sentence joke.'}],
                role: 'user'
            }]
        },
        {
            contents: [{
                parts: [{'text': 'Why is the sky blue?'}],
                role: 'user'
            }]
        }
    ]

    const response = await ai.batches.create({
        model: 'gemini-2.5-flash',
        src: inlinedRequests,
        config: {
            displayName: 'inlined-requests-job-1',
        }
    });

    console.log(response);

### REST

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:batchGenerateContent \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -X POST \
    -H "Content-Type:application/json" \
    -d '{
        "batch": {
            "display_name": "my-batch-requests",
            "input_config": {
                "requests": {
                    "requests": [
                        {
                            "request": {"contents": [{"parts": [{"text": "Describe the process of photosynthesis."}]}]},
                            "metadata": {
                                "key": "request-1"
                            }
                        },
                        {
                            "request": {"contents": [{"parts": [{"text": "Describe the process of photosynthesis."}]}]},
                            "metadata": {
                                "key": "request-2"
                            }
                        }
                    ]
                }
            }
        }
    }'

### Input file

For larger sets of requests, prepare a JSON Lines (JSONL) file. Each line in this file must be a JSON object containing a user-defined key and a request object, where the request is a valid[`GenerateContentRequest`](https://ai.google.dev/api/batch-mode#GenerateContentRequest)object. The user-defined key is used in the response to indicate which output is the result of which request. For example, the request with the key defined as`request-1`will have its response annotated with the same key name.

This file is uploaded using the[File API](https://ai.google.dev/gemini-api/docs/files). The maximum allowed file size for an input file is 2GB.

The following is an example of a JSONL file. You can save it in a file named`my-batch-requests.json`:  

    {"key": "request-1", "request": {"contents": [{"parts": [{"text": "Describe the process of photosynthesis."}]}], "generation_config": {"temperature": 0.7}}}
    {"key": "request-2", "request": {"contents": [{"parts": [{"text": "What are the main ingredients in a Margherita pizza?"}]}]}}

Similarly to inline requests, you can specify other parameters like system instructions, tools or other configurations in each request JSON.

You can upload this file using the[File API](https://ai.google.dev/gemini-api/docs/files)as shown in the following example. If you are working with multimodal input, you can reference other uploaded files within your JSONL file.  

### Python


    import json
    from google import genai
    from google.genai import types

    client = genai.Client()

    # Create a sample JSONL file
    with open("my-batch-requests.jsonl", "w") as f:
        requests = [
            {"key": "request-1", "request": {"contents": [{"parts": [{"text": "Describe the process of photosynthesis."}]}]}},
            {"key": "request-2", "request": {"contents": [{"parts": [{"text": "What are the main ingredients in a Margherita pizza?"}]}]}}
        ]
        for req in requests:
            f.write(json.dumps(req) + "\n")

    # Upload the file to the File API
    uploaded_file = client.files.upload(
        file='my-batch-requests.jsonl',
        config=types.UploadFileConfig(display_name='my-batch-requests', mime_type='jsonl')
    )

    print(f"Uploaded file: {uploaded_file.name}")

### JavaScript


    import {GoogleGenAI} from '@google/genai';
    import * as fs from "fs";
    import * as path from "path";
    import { fileURLToPath } from 'url';

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
    const fileName = "my-batch-requests.jsonl";

    // Define the requests
    const requests = [
        { "key": "request-1", "request": { "contents": [{ "parts": [{ "text": "Describe the process of photosynthesis." }] }] } },
        { "key": "request-2", "request": { "contents": [{ "parts": [{ "text": "What are the main ingredients in a Margherita pizza?" }] }] } }
    ];

    // Construct the full path to file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, fileName); // __dirname is the directory of the current script

    async function writeBatchRequestsToFile(requests, filePath) {
        try {
            // Use a writable stream for efficiency, especially with larger files.
            const writeStream = fs.createWriteStream(filePath, { flags: 'w' });

            writeStream.on('error', (err) => {
                console.error(`Error writing to file ${filePath}:`, err);
            });

            for (const req of requests) {
                writeStream.write(JSON.stringify(req) + '\n');
            }

            writeStream.end();

            console.log(`Successfully wrote batch requests to ${filePath}`);

        } catch (error) {
            // This catch block is for errors that might occur before stream setup,
            // stream errors are handled by the 'error' event.
            console.error(`An unexpected error occurred:`, error);
        }
    }

    // Write to a file.
    writeBatchRequestsToFile(requests, filePath);

    // Upload the file to the File API.
    const uploadedFile = await ai.files.upload({file: 'my-batch-requests.jsonl', config: {
        mimeType: 'jsonl',
    }});
    console.log(uploadedFile.name);

### REST

    tmp_batch_input_file=batch_input.tmp
    echo -e '{"contents": [{"parts": [{"text": "Describe the process of photosynthesis."}]}], "generationConfig": {"temperature": 0.7}}\n{"contents": [{"parts": [{"text": "What are the main ingredients in a Margherita pizza?"}]}]}' > batch_input.tmp
    MIME_TYPE=$(file -b --mime-type "${tmp_batch_input_file}")
    NUM_BYTES=$(wc -c < "${tmp_batch_input_file}")
    DISPLAY_NAME=BatchInput

    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files" \
    -D "${tmp_header_file}" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "X-Goog-Upload-Protocol: resumable" \
    -H "X-Goog-Upload-Command: start" \
    -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
    -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
    -H "Content-Type: application/jsonl" \
    -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
    -H "Content-Length: ${NUM_BYTES}" \
    -H "X-Goog-Upload-Offset: 0" \
    -H "X-Goog-Upload-Command: upload, finalize" \
    --data-binary "@${tmp_batch_input_file}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)

The following example calls the[`BatchGenerateContent`](https://ai.google.dev/api/batch-mode#google.ai.generativelanguage.v1beta.BatchService.BatchGenerateContent)method with the input file uploaded using File API:  

### Python

    from google import genai

    # Assumes `uploaded_file` is the file object from the previous step
    client = genai.Client()
    file_batch_job = client.batches.create(
        model="gemini-2.5-flash",
        src=uploaded_file.name,
        config={
            'display_name': "file-upload-job-1",
        },
    )

    print(f"Created batch job: {file_batch_job.name}")

### JavaScript

    // Assumes `uploadedFile` is the file object from the previous step
    const fileBatchJob = await ai.batches.create({
        model: 'gemini-2.5-flash',
        src: uploadedFile.name,
        config: {
            displayName: 'file-upload-job-1',
        }
    });

    console.log(fileBatchJob);

### REST

    # Set the File ID taken from the upload response.
    BATCH_INPUT_FILE='files/123456'
    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:batchGenerateContent \
    -X POST \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type:application/json" \
    -d "{
        'batch': {
            'display_name': 'my-batch-requests',
            'input_config': {
                'file_name': '${BATCH_INPUT_FILE}'
            }
        }
    }"

When you create a batch job, you will get a job name returned. Use this name for[monitoring](https://ai.google.dev/gemini-api/docs/batch-api#batch-job-status)the job status as well as[retrieving the results](https://ai.google.dev/gemini-api/docs/batch-api#retrieve-batch-results)once the job completes.

The following is an example output that contains a job name:  


    Created batch job from file: batches/123456789

### Batch embedding support

You can use the Batch API to interact with the[Embeddings model](https://ai.google.dev/gemini-api/docs/embeddings)for higher throughput. To create an embeddings batch job with either[inline requests](https://ai.google.dev/gemini-api/docs/batch-api#inline-requests)or[input files](https://ai.google.dev/gemini-api/docs/batch-api#input-file), use the`batches.create_embeddings`API and specify the embeddings model.  

### Python

    from google import genai

    client = genai.Client()

    # Creating an embeddings batch job with an input file request:
    file_job = client.batches.create_embeddings(
        model="gemini-embedding-001",
        src={'file_name': uploaded_batch_requests.name},
        config={'display_name': "Input embeddings batch"},
    )

    # Creating an embeddings batch job with an inline request:
    batch_job = client.batches.create_embeddings(
        model="gemini-embedding-001",
        # For a predefined list of requests `inlined_requests`
        src={'inlined_requests': inlined_requests},
        config={'display_name': "Inlined embeddings batch"},
    )

### JavaScript

    // Creating an embeddings batch job with an input file request:
    let fileJob;
    fileJob = await client.batches.createEmbeddings({
        model: 'gemini-embedding-001',
        src: {fileName: uploadedBatchRequests.name},
        config: {displayName: 'Input embeddings batch'},
    });
    console.log(`Created batch job: ${fileJob.name}`);

    // Creating an embeddings batch job with an inline request:
    let batchJob;
    batchJob = await client.batches.createEmbeddings({
        model: 'gemini-embedding-001',
        // For a predefined a list of requests `inlinedRequests`
        src: {inlinedRequests: inlinedRequests},
        config: {displayName: 'Inlined embeddings batch'},
    });
    console.log(`Created batch job: ${batchJob.name}`);

Read the Embeddings section in the[Batch API cookbook](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Batch_mode.ipynb)for more examples.

### Request configuration

You can include any request configurations you would use in a standard non-batch request. For example, you could specify the temperature, system instructions or even pass in other modalities. The following example shows an example inline request that contains a system instruction for one of the requests:  

### Python

    inline_requests_list = [
        {'contents': [{'parts': [{'text': 'Write a short poem about a cloud.'}]}]},
        {'contents': [{
            'parts': [{
                'text': 'Write a short poem about a cat.'
                }]
            }],
        'config': {
            'system_instruction': {'parts': [{'text': 'You are a cat. Your name is Neko.'}]}}
        }
    ]

### JavaScript

    inlineRequestsList = [
        {contents: [{parts: [{text: 'Write a short poem about a cloud.'}]}]},
        {contents: [{parts: [{text: 'Write a short poem about a cat.'}]}],
         config: {systemInstruction: {parts: [{text: 'You are a cat. Your name is Neko.'}]}}}
    ]

Similarly can specify tools to use for a request. The following example shows a request that enables the[Google Search tool](https://ai.google.dev/gemini-api/docs/google-search):  

### Python

    inlined_requests = [
    {'contents': [{'parts': [{'text': 'Who won the euro 1998?'}]}]},
    {'contents': [{'parts': [{'text': 'Who won the euro 2025?'}]}],
     'config':{'tools': [{'google_search': {}}]}}]

### JavaScript

    inlineRequestsList = [
        {contents: [{parts: [{text: 'Who won the euro 1998?'}]}]},
        {contents: [{parts: [{text: 'Who won the euro 2025?'}]}],
         config: {tools: [{googleSearch: {}}]}}
    ]

You can specify[structured output](https://ai.google.dev/gemini-api/docs/structured-output)as well. The following example shows how to specify for your batch requests.  

### Python

    import time
    from google import genai
    from pydantic import BaseModel, TypeAdapter

    class Recipe(BaseModel):
        recipe_name: str
        ingredients: list[str]

    client = genai.Client()

    # A list of dictionaries, where each is a GenerateContentRequest
    inline_requests = [
        {
            'contents': [{
                'parts': [{'text': 'List a few popular cookie recipes, and include the amounts of ingredients.'}],
                'role': 'user'
            }],
            'config': {
                'response_mime_type': 'application/json',
                'response_schema': list[Recipe]
            }
        },
        {
            'contents': [{
                'parts': [{'text': 'List a few popular gluten free cookie recipes, and include the amounts of ingredients.'}],
                'role': 'user'
            }],
            'config': {
                'response_mime_type': 'application/json',
                'response_schema': list[Recipe]
            }
        }
    ]

    inline_batch_job = client.batches.create(
        model="models/gemini-2.5-flash",
        src=inline_requests,
        config={
            'display_name': "structured-output-job-1"
        },
    )

    # wait for the job to finish
    job_name = inline_batch_job.name
    print(f"Polling status for job: {job_name}")

    while True:
        batch_job_inline = client.batches.get(name=job_name)
        if batch_job_inline.state.name in ('JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED'):
            break
        print(f"Job not finished. Current state: {batch_job_inline.state.name}. Waiting 30 seconds...")
        time.sleep(30)

    print(f"Job finished with state: {batch_job_inline.state.name}")

    # print the response
    for i, inline_response in enumerate(batch_job_inline.dest.inlined_responses, start=1):
        print(f"\n--- Response {i} ---")

        # Check for a successful response
        if inline_response.response:
            # The .text property is a shortcut to the generated text.
            print(inline_response.response.text)

### JavaScript


    import {GoogleGenAI, Type} from '@google/genai';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

    const inlinedRequests = [
        {
            contents: [{
                parts: [{text: 'List a few popular cookie recipes, and include the amounts of ingredients.'}],
                role: 'user'
            }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    'recipeName': {
                        type: Type.STRING,
                        description: 'Name of the recipe',
                        nullable: false,
                    },
                    'ingredients': {
                        type: Type.ARRAY,
                        items: {
                        type: Type.STRING,
                        description: 'Ingredients of the recipe',
                        nullable: false,
                        },
                    },
                    },
                    required: ['recipeName'],
                },
                },
            }
        },
        {
            contents: [{
                parts: [{text: 'List a few popular gluten free cookie recipes, and include the amounts of ingredients.'}],
                role: 'user'
            }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    'recipeName': {
                        type: Type.STRING,
                        description: 'Name of the recipe',
                        nullable: false,
                    },
                    'ingredients': {
                        type: Type.ARRAY,
                        items: {
                        type: Type.STRING,
                        description: 'Ingredients of the recipe',
                        nullable: false,
                        },
                    },
                    },
                    required: ['recipeName'],
                },
                },
            }
        }
    ]

    const inlinedBatchJob = await ai.batches.create({
        model: 'gemini-2.5-flash',
        src: inlinedRequests,
        config: {
            displayName: 'inlined-requests-job-1',
        }
    });

## Monitoring job status

Use the operation name obtained when creating the batch job to poll its status. The state field of the batch job will indicate its current status. A batch job can be in one of the following states:

- `JOB_STATE_PENDING`: The job has been created and is waiting to be processed by the service.
- `JOB_STATE_RUNNING`: The job is in progress.
- `JOB_STATE_SUCCEEDED`: The job completed successfully. You can now retrieve the results.
- `JOB_STATE_FAILED`: The job failed. Check the error details for more information.
- `JOB_STATE_CANCELLED`: The job was cancelled by the user.
- `JOB_STATE_EXPIRED`: The job has expired because it was running or pending for more than 48 hours. The job will not have any results to retrieve. You can try submitting the job again or splitting up the requests into smaller batches.

You can poll the job status periodically to check for completion.  

### Python

    import time
    from google import genai

    client = genai.Client()

    # Use the name of the job you want to check
    # e.g., inline_batch_job.name from the previous step
    job_name = "YOUR_BATCH_JOB_NAME"  # (e.g. 'batches/your-batch-id')
    batch_job = client.batches.get(name=job_name)

    completed_states = set([
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED',
    ])

    print(f"Polling status for job: {job_name}")
    batch_job = client.batches.get(name=job_name) # Initial get
    while batch_job.state.name not in completed_states:
      print(f"Current state: {batch_job.state.name}")
      time.sleep(30) # Wait for 30 seconds before polling again
      batch_job = client.batches.get(name=job_name)

    print(f"Job finished with state: {batch_job.state.name}")
    if batch_job.state.name == 'JOB_STATE_FAILED':
        print(f"Error: {batch_job.error}")

### JavaScript

    // Use the name of the job you want to check
    // e.g., inlinedBatchJob.name from the previous step
    let batchJob;
    const completedStates = new Set([
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED',
    ]);

    try {
        batchJob = await ai.batches.get({name: inlinedBatchJob.name});
        while (!completedStates.has(batchJob.state)) {
            console.log(`Current state: ${batchJob.state}`);
            // Wait for 30 seconds before polling again
            await new Promise(resolve => setTimeout(resolve, 30000));
            batchJob = await client.batches.get({ name: batchJob.name });
        }
        console.log(`Job finished with state: ${batchJob.state}`);
        if (batchJob.state === 'JOB_STATE_FAILED') {
            // The exact structure of `error` might vary depending on the SDK
            // This assumes `error` is an object with a `message` property.
            console.error(`Error: ${batchJob.state}`);
        }
    } catch (error) {
        console.error(`An error occurred while polling job ${batchJob.name}:`, error);
    }

## Retrieving results

Once the job status indicates your batch job has succeeded, the results are available in the`response`field.  

### Python

    import json
    from google import genai

    client = genai.Client()

    # Use the name of the job you want to check
    # e.g., inline_batch_job.name from the previous step
    job_name = "YOUR_BATCH_JOB_NAME"
    batch_job = client.batches.get(name=job_name)

    if batch_job.state.name == 'JOB_STATE_SUCCEEDED':

        # If batch job was created with a file
        if batch_job.dest and batch_job.dest.file_name:
            # Results are in a file
            result_file_name = batch_job.dest.file_name
            print(f"Results are in file: {result_file_name}")

            print("Downloading result file content...")
            file_content = client.files.download(file=result_file_name)
            # Process file_content (bytes) as needed
            print(file_content.decode('utf-8'))

        # If batch job was created with inline request
        # (for embeddings, use batch_job.dest.inlined_embed_content_responses)
        elif batch_job.dest and batch_job.dest.inlined_responses:
            # Results are inline
            print("Results are inline:")
            for i, inline_response in enumerate(batch_job.dest.inlined_responses):
                print(f"Response {i+1}:")
                if inline_response.response:
                    # Accessing response, structure may vary.
                    try:
                        print(inline_response.response.text)
                    except AttributeError:
                        print(inline_response.response) # Fallback
                elif inline_response.error:
                    print(f"Error: {inline_response.error}")
        else:
            print("No results found (neither file nor inline).")
    else:
        print(f"Job did not succeed. Final state: {batch_job.state.name}")
        if batch_job.error:
            print(f"Error: {batch_job.error}")

### JavaScript

    // Use the name of the job you want to check
    // e.g., inlinedBatchJob.name from the previous step
    const jobName = "YOUR_BATCH_JOB_NAME";

    try {
        const batchJob = await ai.batches.get({ name: jobName });

        if (batchJob.state === 'JOB_STATE_SUCCEEDED') {
            console.log('Found completed batch:', batchJob.displayName);
            console.log(batchJob);

            // If batch job was created with a file destination
            if (batchJob.dest?.fileName) {
                const resultFileName = batchJob.dest.fileName;
                console.log(`Results are in file: ${resultFileName}`);

                console.log("Downloading result file content...");
                const fileContentBuffer = await ai.files.download({ file: resultFileName });

                // Process fileContentBuffer (Buffer) as needed
                console.log(fileContentBuffer.toString('utf-8'));
            }

            // If batch job was created with inline responses
            else if (batchJob.dest?.inlinedResponses) {
                console.log("Results are inline:");
                for (let i = 0; i < batchJob.dest.inlinedResponses.length; i++) {
                    const inlineResponse = batchJob.dest.inlinedResponses[i];
                    console.log(`Response ${i + 1}:`);
                    if (inlineResponse.response) {
                        // Accessing response, structure may vary.
                        if (inlineResponse.response.text !== undefined) {
                            console.log(inlineResponse.response.text);
                        } else {
                            console.log(inlineResponse.response); // Fallback
                        }
                    } else if (inlineResponse.error) {
                        console.error(`Error: ${inlineResponse.error}`);
                    }
                }
            }

            // If batch job was an embedding batch with inline responses
            else if (batchJob.dest?.inlinedEmbedContentResponses) {
                console.log("Embedding results found inline:");
                for (let i = 0; i < batchJob.dest.inlinedEmbedContentResponses.length; i++) {
                    const inlineResponse = batchJob.dest.inlinedEmbedContentResponses[i];
                    console.log(`Response ${i + 1}:`);
                    if (inlineResponse.response) {
                        console.log(inlineResponse.response);
                    } else if (inlineResponse.error) {
                        console.error(`Error: ${inlineResponse.error}`);
                    }
                }
            } else {
                console.log("No results found (neither file nor inline).");
            }
        } else {
            console.log(`Job did not succeed. Final state: ${batchJob.state}`);
            if (batchJob.error) {
                console.error(`Error: ${typeof batchJob.error === 'string' ? batchJob.error : batchJob.error.message || JSON.stringify(batchJob.error)}`);
            }
        }
    } catch (error) {
        console.error(`An error occurred while processing job ${jobName}:`, error);
    }

### REST

    BATCH_NAME="batches/123456" # Your batch job name

    curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type:application/json" 2> /dev/null > batch_status.json

    if jq -r '.done' batch_status.json | grep -q "false"; then
        echo "Batch has not finished processing"
    fi

    batch_state=$(jq -r '.metadata.state' batch_status.json)
    if [[ $batch_state = "JOB_STATE_SUCCEEDED" ]]; then
        if [[ $(jq '.response | has("inlinedResponses")' batch_status.json) = "true" ]]; then
            jq -r '.response.inlinedResponses' batch_status.json
            exit
        fi
        responses_file_name=$(jq -r '.response.responsesFile' batch_status.json)
        curl https://generativelanguage.googleapis.com/download/v1beta/$responses_file_name:download?alt=media \
        -H "x-goog-api-key: $GEMINI_API_KEY" 2> /dev/null
    elif [[ $batch_state = "JOB_STATE_FAILED" ]]; then
        jq '.error' batch_status.json
    elif [[ $batch_state == "JOB_STATE_CANCELLED" ]]; then
        echo "Batch was cancelled by the user"
    elif [[ $batch_state == "JOB_STATE_EXPIRED" ]]; then
        echo "Batch expired after 48 hours"
    fi

## Cancelling a batch job

You can cancel an ongoing batch job using its name. When a job is canceled, it stops processing new requests.  

### Python

    from google import genai

    client = genai.Client()

    # Cancel a batch job
    client.batches.cancel(name=batch_job_to_cancel.name)

### JavaScript

    await ai.batches.cancel({name: batchJobToCancel.name});

### REST

    BATCH_NAME="batches/123456" # Your batch job name

    # Cancel the batch
    curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME:cancel \
    -H "x-goog-api-key: $GEMINI_API_KEY" \

    # Confirm that the status of the batch after cancellation is JOB_STATE_CANCELLED
    curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type:application/json" 2> /dev/null | jq -r '.metadata.state'

## Deleting a batch job

You can delete an existing batch job using its name. When a job is deleted, it stops processing new requests and is removed from the list of batch jobs.  

### Python

    from google import genai

    client = genai.Client()

    # Delete a batch job
    client.batches.delete(name=batch_job_to_delete.name)

### JavaScript

    await ai.batches.delete({name: batchJobToDelete.name});

### REST

    BATCH_NAME="batches/123456" # Your batch job name

    # Delete the batch job
    curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME:delete \
    -H "x-goog-api-key: $GEMINI_API_KEY"

## Technical details

- **Supported models:** Batch API supports a range of Gemini models. Refer to the[Models page](https://ai.google.dev/gemini-api/docs/models)for each model's support of Batch API. The supported modalities for Batch API are the same as what's supported on the interactive (or non-batch) API.
- **Pricing:** Batch API usage is priced at 50% of the standard interactive API cost for the equivalent model. See the[pricing page](https://ai.google.dev/gemini-api/docs/pricing)for details. Refer to the[rate limits page](https://ai.google.dev/gemini-api/docs/rate-limits#batch-mode)for details on rate limits for this feature.
- **Service Level Objective (SLO):**Batch jobs are designed to complete within a 24-hour turnaround time. Many jobs may complete much faster depending on their size and current system load.
- **Caching:** [Context caching](https://ai.google.dev/gemini-api/docs/caching)is enabled for batch requests. If a request in your batch results in a cache hit, the cached tokens are priced the same as for non-batch API traffic.

## Best practices

- **Use input files for large requests:** For a large number of requests, always use the file input method for better manageability and to avoid hitting request size limits for the[`BatchGenerateContent`](https://ai.google.dev/api/batch-mode#google.ai.generativelanguage.v1beta.BatchService.BatchGenerateContent)call itself. Note that there's a the 2GB file size limit per input file.
- **Error handling:** Check the`batchStats`for`failedRequestCount`after a job completes. If using file output, parse each line to check if it's a`GenerateContentResponse`or a status object indicating an error for that specific request. See the[troubleshooting guide](https://ai.google.dev/gemini-api/docs/troubleshooting#error-codes)for a complete set of error codes.
- **Submit jobs once:**The creation of a batch job is not idempotent. If you send the same creation request twice, two separate batch jobs will be created.
- **Break up very large batches:**While the target turnaround time is 24 hours, actual processing time can vary based on system load and job size. For large jobs, consider breaking them into smaller batches if intermediate results are needed sooner.

## What's next

- Check out the[Batch API notebook](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Batch_mode.ipynb)for more examples.
- The OpenAI compatibility layer supports Batch API. Read the examples on the[OpenAI Compatibility](https://ai.google.dev/gemini-api/docs/openai#batch)page.




https://ai.google.dev/gemini-api/docs/image-generation.md.
<br />

<br />

Gemini can generate and process images conversationally. You can prompt Gemini with text, images, or a combination of both, allowing you to create, edit, and iterate on visuals with unprecedented control:

- **Text-to-Image:**Generate high-quality images from simple or complex text descriptions.
- **Image + Text-to-Image (Editing):**Provide an image and use text prompts to add, remove, or modify elements, change the style, or adjust the color grading.
- **Multi-Image to Image (Composition \& style transfer):**Use multiple input images to compose a new scene or transfer the style from one image to another.
- **Iterative refinement:**Engage in a conversation to progressively refine your image over multiple turns, making small adjustments until it's perfect.
- **High-Fidelity text rendering:**Accurately generate images that contain legible and well-placed text, ideal for logos, diagrams, and posters.

All generated images include a[SynthID watermark](https://ai.google.dev/responsible/docs/safeguards/synthid).

This guide describes both the fast Gemini 2.5 Flash and the advanced Gemini 3 Pro Preview image models, with examples of capabilities from basic text-to-image to complex, multi-turn refinements, 4K output, and search-grounded generation.

## Model selection

Choose the model best suited for your specific use case.

- **Gemini 3 Pro Image Preview (Nano Banana Pro Preview)**is designed for professional asset production and complex instructions. This model features real-world grounding using Google Search, a default "Thinking" process that refines composition prior to generation, and can generate images of up to 4K resolutions.

- **Gemini 2.5 Flash Image (Nano Banana)**is designed for speed and efficiency. This model is optimized for high-volume, low-latency tasks and generates images at 1024px resolution.

## Image generation (text-to-image)

The following code demonstrates how to generate an image based on a descriptive prompt.  

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    prompt = (
        "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("generated_image.png")

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("gemini-native-image.png", buffer);
          console.log("Image saved as gemini-native-image.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          genai.Text("Create a picture of a nano banana dish in a " +
                     " fancy restaurant with a Gemini theme"),
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "gemini_generated_image.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class TextToImage {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("_01_generated_image.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### REST

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
          ]
        }]
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > gemini-native-image.png

![AI-generated image of a nano banana dish](https://ai.google.dev/static/gemini-api/docs/images/nano-banana.png)AI-generated image of a nano banana dish in a Gemini-themed restaurant

## Image editing (text-and-image-to-image)

**Reminder** : Make sure you have the necessary rights to any images you upload. Don't generate content that infringe on others' rights, including videos or images that deceive, harass, or harm. Your use of this generative AI service is subject to our[Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy).

The following example demonstrates uploading base64 encoded images. For multiple images, larger payloads, and supported MIME types, check the[Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)page.  

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    prompt = (
        "Create a picture of my cat eating a nano-banana in a "
        "fancy restaurant under the Gemini constellation",
    )

    image = Image.open("/path/to/cat_image.png")

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt, image],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("generated_image.png")

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "path/to/cat_image.png";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        { text: "Create a picture of my cat eating a nano-banana in a" +
                "fancy restaurant under the Gemini constellation" },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("gemini-native-image.png", buffer);
          console.log("Image saved as gemini-native-image.png");
        }
      }
    }

    main();

### Go

    package main

    import (
     "context"
     "fmt"
     "log"
     "os"
     "google.golang.org/genai"
    )

    func main() {

     ctx := context.Background()
     client, err := genai.NewClient(ctx, nil)
     if err != nil {
         log.Fatal(err)
     }

     imagePath := "/path/to/cat_image.png"
     imgData, _ := os.ReadFile(imagePath)

     parts := []*genai.Part{
       genai.NewPartFromText("Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation"),
       &genai.Part{
         InlineData: &genai.Blob{
           MIMEType: "image/png",
           Data:     imgData,
         },
       },
     }

     contents := []*genai.Content{
       genai.NewContentFromParts(parts, genai.RoleUser),
     }

     result, _ := client.Models.GenerateContent(
         ctx,
         "gemini-2.5-flash-image",
         contents,
     )

     for _, part := range result.Candidates[0].Content.Parts {
         if part.Text != "" {
             fmt.Println(part.Text)
         } else if part.InlineData != nil {
             imageBytes := part.InlineData.Data
             outputFilename := "gemini_generated_image.png"
             _ = os.WriteFile(outputFilename, imageBytes, 0644)
         }
     }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class TextAndImageToImage {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromText("""
                      Create a picture of my cat eating a nano-banana in
                      a fancy restaurant under the Gemini constellation
                      """),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("src/main/resources/cat.jpg")),
                      "image/jpeg")),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("gemini_generated_image.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### REST

    IMG_PATH=/path/to/cat_image.jpeg

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {\"text\": \"'Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation\"},
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/jpeg\",
                    \"data\": \"$IMG_BASE64\"
                  }
                }
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > gemini-edited-image.png

![AI-generated image of a cat eating anano banana](https://ai.google.dev/static/gemini-api/docs/images/cat-banana.png)AI-generated image of a cat eating a nano banana

### Multi-turn image editing

Keep generating and editing images conversationally. Chat or multi-turn conversation is the recommended way to iterate on images. The following example shows a prompt to generate an infographic about photosynthesis.  

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    chat = client.chats.create(
        model="gemini-3-pro-image-preview",
        config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE'],
            tools=[{"google_search": {}}]
        )
    )

    message = "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader."

    response = chat.send_message(message)

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image:= part.as_image():
            image.save("photosynthesis.png")

### Javascript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const chat = ai.chats.create({
        model: "gemini-3-pro-image-preview",
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          tools: [{googleSearch: {}}],
        },
      });

    await main();

    const message = "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader."

    let response = await chat.sendMessage({message});

    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("photosynthesis.png", buffer);
          console.log("Image saved as photosynthesis.png");
        }
    }

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"

        "google.golang.org/genai"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }
        defer client.Close()

        model := client.GenerativeModel("gemini-3-pro-image-preview")
        model.GenerationConfig = &pb.GenerationConfig{
            ResponseModalities: []pb.ResponseModality{genai.Text, genai.Image},
        }
        chat := model.StartChat()

        message := "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader."

        resp, err := chat.SendMessage(ctx, genai.Text(message))
        if err != nil {
            log.Fatal(err)
        }

        for _, part := range resp.Candidates[0].Content.Parts {
            if txt, ok := part.(genai.Text); ok {
                fmt.Printf("%s", string(txt))
            } else if img, ok := part.(genai.ImageData); ok {
                err := os.WriteFile("photosynthesis.png", img.Data, 0644)
                if err != nil {
                    log.Fatal(err)
                }
            }
        }
    }

### Java

    import com.google.genai.Chat;
    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.GoogleSearch;
    import com.google.genai.types.ImageConfig;
    import com.google.genai.types.Part;
    import com.google.genai.types.RetrievalConfig;
    import com.google.genai.types.Tool;
    import com.google.genai.types.ToolConfig;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class MultiturnImageEditing {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {

          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .tools(Tool.builder()
                  .googleSearch(GoogleSearch.builder().build())
                  .build())
              .build();

          Chat chat = client.chats.create("gemini-3-pro-image-preview", config);

          GenerateContentResponse response = chat.sendMessage("""
              Create a vibrant infographic that explains photosynthesis
              as if it were a recipe for a plant's favorite food.
              Show the "ingredients" (sunlight, water, CO2)
              and the "finished dish" (sugar/energy).
              The style should be like a page from a colorful
              kids' cookbook, suitable for a 4th grader.
              """);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("photosynthesis.png"), blob.data().get());
              }
            }
          }
          // ...
        }
      }
    }

### REST

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "role": "user",
          "parts": [
            {"text": "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plants favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids cookbook, suitable for a 4th grader."}
          ]
        }],
        "generationConfig": {
          "responseModalities": ["TEXT", "IMAGE"]
        }
      }' > turn1_response.json

    cat turn1_response.json
    # Requires jq to parse JSON response
    jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' turn1_response.json | head -1 | base64 --decode > photosynthesis.png

![AI-generated infographic about photosynthesis](https://ai.google.dev/static/gemini-api/docs/images/infographic-eng.png)AI-generated infographic about photosynthesis

You can then use the same chat to change the language on the graphic to Spanish.  

### Python

    message = "Update this infographic to be in Spanish. Do not change any other elements of the image."
    aspect_ratio = "16:9" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
    resolution = "2K" # "1K", "2K", "4K"

    response = chat.send_message(message,
        config=types.GenerateContentConfig(
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution
            ),
        ))

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image:= part.as_image():
            image.save("photosynthesis_spanish.png")

### Javascript

    const message = 'Update this infographic to be in Spanish. Do not change any other elements of the image.';
    const aspectRatio = '16:9';
    const resolution = '2K';

    let response = await chat.sendMessage({
      message,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
        tools: [{googleSearch: {}}],
      },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("photosynthesis2.png", buffer);
          console.log("Image saved as photosynthesis2.png");
        }
    }

### Go

    message = "Update this infographic to be in Spanish. Do not change any other elements of the image."
    aspect_ratio = "16:9" // "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
    resolution = "2K"     // "1K", "2K", "4K"

    model.GenerationConfig.ImageConfig = &pb.ImageConfig{
        AspectRatio: aspect_ratio,
        ImageSize:   resolution,
    }

    resp, err = chat.SendMessage(ctx, genai.Text(message))
    if err != nil {
        log.Fatal(err)
    }

    for _, part := range resp.Candidates[0].Content.Parts {
        if txt, ok := part.(genai.Text); ok {
            fmt.Printf("%s", string(txt))
        } else if img, ok := part.(genai.ImageData); ok {
            err := os.WriteFile("photosynthesis_spanish.png", img.Data, 0644)
            if err != nil {
                log.Fatal(err)
            }
        }
    }

### Java

    String aspectRatio = "16:9"; // "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
    String resolution = "2K"; // "1K", "2K", "4K"

    config = GenerateContentConfig.builder()
        .responseModalities("TEXT", "IMAGE")
        .imageConfig(ImageConfig.builder()
            .aspectRatio(aspectRatio)
            .imageSize(resolution)
            .build())
        .build();

    response = chat.sendMessage(
        "Update this infographic to be in Spanish. " + 
        "Do not change any other elements of the image.",
        config);

    for (Part part : response.parts()) {
      if (part.text().isPresent()) {
        System.out.println(part.text().get());
      } else if (part.inlineData().isPresent()) {
        var blob = part.inlineData().get();
        if (blob.data().isPresent()) {
          Files.write(Paths.get("photosynthesis_spanish.png"), blob.data().get());
        }
      }
    }

### REST

    # Create request2.json by combining history and new prompt
    # Read model's previous response content directly into jq
    jq --argjson user1 '{"role": "user", "parts": [{"text": "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant'\''s favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids'\'' cookbook, suitable for a 4th grader."}]}' \
      --argjson user2 '{"role": "user", "parts": [{"text": "Update this infographic to be in Spanish. Do not change any other elements of the image."}]}' \
      -f /dev/stdin turn1_response.json > request2.json <<'EOF_JQ_FILTER'
    .candidates[0].content | {
      "contents": [$user1, ., $user2],
      "tools": [{"google_search": {}}],
      "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
          "aspectRatio": "16:9",
          "imageSize": "2K"
        }
      }
    }
    EOF_JQ_FILTER

    curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d @request2.json > turn2_response.json

    jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' turn2_response.json | head -1 | base64 --decode > photosynthesis_spanish.png

![AI-generated infographic of photosynthesis in Spanish](https://ai.google.dev/static/gemini-api/docs/images/infographic-spanish.png)AI-generated infographic of photosynthesis in Spanish

## New with Gemini 3 Pro Image

Gemini 3 Pro Image (`gemini-3-pro-image-preview`) is a state-of-the-art image generation and editing model optimized for professional asset production. Designed to tackle the most challenging workflows through advanced reasoning, it excels at complex, multi-turn creation and modification tasks.

- **High-resolution output**: Built-in generation capabilities for 1K, 2K, and 4K visuals.
- **Advanced text rendering**: Capable of generating legible, stylized text for infographics, menus, diagrams, and marketing assets.
- **Grounding with Google Search**: The model can use Google Search as a tool to verify facts and generate imagery based on real-time data (e.g., current weather maps, stock charts, recent events).
- **Thinking mode**: The model utilizes a "thinking" process to reason through complex prompts. It generates interim "thought images" (visible in the backend but not charged) to refine the composition before producing the final high-quality output.
- **Up to 14 reference images**: You can now mix up to 14 reference images to produce the final image.

### Use up to 14 reference images

Gemini 3 Pro Preview lets you to mix up to 14 reference images. These 14 images can include the following:

- Up to 6 images of objects with high-fidelity to include in the final image
- Up to 5 images of humans to maintain character consistency

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    prompt = "An office group photo of these people, they are making funny faces."
    aspect_ratio = "5:4" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
    resolution = "2K" # "1K", "2K", "4K"

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            prompt,
            Image.open('person1.png'),
            Image.open('person2.png'),
            Image.open('person3.png'),
            Image.open('person4.png'),
            Image.open('person5.png'),
        ],
        config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution
            ),
        )
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image:= part.as_image():
            image.save("office.png")

### Javascript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
          'An office group photo of these people, they are making funny faces.';
      const aspectRatio = '5:4';
      const resolution = '2K';

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageFile1,
        },
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageFile2,
        },
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageFile3,
        },
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageFile4,
        },
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageFile5,
        },
      }
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: resolution,
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("image.png", buffer);
          console.log("Image saved as image.png");
        }
      }

    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"

        "google.golang.org/genai"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }
        defer client.Close()

        model := client.GenerativeModel("gemini-3-pro-image-preview")
        model.GenerationConfig = &pb.GenerationConfig{
            ResponseModalities: []pb.ResponseModality{genai.Text, genai.Image},
            ImageConfig: &pb.ImageConfig{
                AspectRatio: "5:4",
                ImageSize:   "2K",
            },
        }

        img1, err := os.ReadFile("person1.png")
        if err != nil { log.Fatal(err) }
        img2, err := os.ReadFile("person2.png")
        if err != nil { log.Fatal(err) }
        img3, err := os.ReadFile("person3.png")
        if err != nil { log.Fatal(err) }
        img4, err := os.ReadFile("person4.png")
        if err != nil { log.Fatal(err) }
        img5, err := os.ReadFile("person5.png")
        if err != nil { log.Fatal(err) }

        parts := []genai.Part{
            genai.Text("An office group photo of these people, they are making funny faces."),
            genai.ImageData{MIMEType: "image/png", Data: img1},
            genai.ImageData{MIMEType: "image/png", Data: img2},
            genai.ImageData{MIMEType: "image/png", Data: img3},
            genai.ImageData{MIMEType: "image/png", Data: img4},
            genai.ImageData{MIMEType: "image/png", Data: img5},
        }

        resp, err := model.GenerateContent(ctx, parts...)
        if err != nil {
            log.Fatal(err)
        }

        for _, part := range resp.Candidates[0].Content.Parts {
            if txt, ok := part.(genai.Text); ok {
                fmt.Printf("%s", string(txt))
            } else if img, ok := part.(genai.ImageData); ok {
                err := os.WriteFile("office.png", img.Data, 0644)
                if err != nil {
                    log.Fatal(err)
                }
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.ImageConfig;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class GroupPhoto {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .imageConfig(ImageConfig.builder()
                  .aspectRatio("5:4")
                  .imageSize("2K")
                  .build())
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview",
              Content.fromParts(
                  Part.fromText("An office group photo of these people, they are making funny faces."),
                  Part.fromBytes(Files.readAllBytes(Path.of("person1.png")), "image/png"),
                  Part.fromBytes(Files.readAllBytes(Path.of("person2.png")), "image/png"),
                  Part.fromBytes(Files.readAllBytes(Path.of("person3.png")), "image/png"),
                  Part.fromBytes(Files.readAllBytes(Path.of("person4.png")), "image/png"),
                  Part.fromBytes(Files.readAllBytes(Path.of("person5.png")), "image/png")
              ), config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("office.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### REST

    IMG_PATH1=person1.png
    IMG_PATH2=person2.png
    IMG_PATH3=person3.png
    IMG_PATH4=person4.png
    IMG_PATH5=person5.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG1_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH1" 2>&1)
    IMG2_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH2" 2>&1)
    IMG3_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH3" 2>&1)
    IMG4_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH4" 2>&1)
    IMG5_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH5" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {\"text\": \"An office group photo of these people, they are making funny faces.\"},
                {\"inline_data\": {\"mime_type\":\"image/png\", \"data\": \"$IMG1_BASE64\"}},
                {\"inline_data\": {\"mime_type\":\"image/png\", \"data\": \"$IMG2_BASE64\"}},
                {\"inline_data\": {\"mime_type\":\"image/png\", \"data\": \"$IMG3_BASE64\"}},
                {\"inline_data\": {\"mime_type\":\"image/png\", \"data\": \"$IMG4_BASE64\"}},
                {\"inline_data\": {\"mime_type\":\"image/png\", \"data\": \"$IMG5_BASE64\"}}
            ]
          }],
          \"generationConfig\": {
            \"responseModalities\": [\"TEXT\", \"IMAGE\"],
            \"imageConfig\": {
              \"aspectRatio\": \"5:4\",
              \"imageSize\": \"2K\"
            }
          }
        }" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | head -1 | base64 --decode > office.png

![AI-generated office group photo](https://ai.google.dev/static/gemini-api/docs/images/office-group-photo.jpeg)AI-generated office group photo

### Grounding with Google Search

Use the[Google Search tool](https://ai.google.dev/gemini-api/docs/google-search)to generate images based on real-time information, such as weather forecasts, stock charts, or recent events.

Notes to consider when using Grounding with Google Search with image generation:

- Image-based search results are not passed to the generation model and are excluded from the response.
- Image only mode (`responseModalities = ["IMAGE"]`) won't return an image output when used with Grounding with Google Search.

### Python

    from google import genai
    prompt = "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day"
    aspect_ratio = "16:9" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=['Text', 'Image'],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
            ),
            tools=[{"google_search": {}}]
        )
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image:= part.as_image():
            image.save("weather.png")

### Javascript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt = 'Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day';
      const aspectRatio = '16:9';
      const resolution = '2K';

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: resolution,
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("image.png", buffer);
          console.log("Image saved as image.png");
        }
      }

    }

    main();

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.GoogleSearch;
    import com.google.genai.types.ImageConfig;
    import com.google.genai.types.Part;
    import com.google.genai.types.Tool;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class SearchGrounding {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .imageConfig(ImageConfig.builder()
                  .aspectRatio("16:9")
                  .build())
              .tools(Tool.builder()
                  .googleSearch(GoogleSearch.builder().build())
                  .build())
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview", """
                  Visualize the current weather forecast for the next 5 days 
                  in San Francisco as a clean, modern weather chart. 
                  Add a visual on what I should wear each day
                  """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("weather.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### REST

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{"parts": [{"text": "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day"}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {
          "responseModalities": ["TEXT", "IMAGE"],
          "imageConfig": {"aspectRatio": "16:9"}
        }
      }' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | head -1 | base64 --decode > weather.png

![AI-generated five day weather chart for San Francisco](https://ai.google.dev/static/gemini-api/docs/images/weather-forecast.png)AI-generated five day weather chart for San Francisco

The response includes`groundingMetadata`which contains the following required fields:

- **`searchEntryPoint`**: Contains the HTML and CSS to render the required search suggestions.
- **`groundingChunks`**: Returns the top 3 web sources used to ground the generated image

### Generate images up to 4K resolution

Gemini 3 Pro Image generates 1K images by default but can also output 2K and 4K images. To generate higher resolution assets, specify the`image_size`in the`generation_config`.

You must use an uppercase 'K' (e.g., 1K, 2K, 4K). Lowercase parameters (e.g., 1k) will be rejected.  

### Python

    from google import genai
    from google.genai import types

    prompt = "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English." 
    aspect_ratio = "1:1" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
    resolution = "1K" # "1K", "2K", "4K"

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution
            ),
        )
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image:= part.as_image():
            image.save("butterfly.png")

### Javascript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
          'Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English.';
      const aspectRatio = '1:1';
      const resolution = '1K';

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: resolution,
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("image.png", buffer);
          console.log("Image saved as image.png");
        }
      }

    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"

        "google.golang.org/genai"
    )

    func main() {
        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }
        defer client.Close()

        model := client.GenerativeModel("gemini-3-pro-image-preview")
        model.GenerationConfig = &pb.GenerationConfig{
            ResponseModalities: []pb.ResponseModality{genai.Text, genai.Image},
            ImageConfig: &pb.ImageConfig{
                AspectRatio: "1:1",
                ImageSize:   "1K",
            },
        }

        prompt := "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."
        resp, err := model.GenerateContent(ctx, genai.Text(prompt))
        if err != nil {
            log.Fatal(err)
        }

        for _, part := range resp.Candidates[0].Content.Parts {
            if txt, ok := part.(genai.Text); ok {
                fmt.Printf("%s", string(txt))
            } else if img, ok := part.(genai.ImageData); ok {
                err := os.WriteFile("butterfly.png", img.Data, 0644)
                if err != nil {
                    log.Fatal(err)
                }
            }
        }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.GoogleSearch;
    import com.google.genai.types.ImageConfig;
    import com.google.genai.types.Part;
    import com.google.genai.types.Tool;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class HiRes {
        public static void main(String[] args) throws IOException {

          try (Client client = new Client()) {
            GenerateContentConfig config = GenerateContentConfig.builder()
                .responseModalities("TEXT", "IMAGE")
                .imageConfig(ImageConfig.builder()
                    .aspectRatio("16:9")
                    .imageSize("4K")
                    .build())
                .build();

            GenerateContentResponse response = client.models.generateContent(
                "gemini-3-pro-image-preview", """
                  Da Vinci style anatomical sketch of a dissected Monarch butterfly.
                  Detailed drawings of the head, wings, and legs on textured
                  parchment with notes in English.
                  """,
                config);

            for (Part part : response.parts()) {
              if (part.text().isPresent()) {
                System.out.println(part.text().get());
              } else if (part.inlineData().isPresent()) {
                var blob = part.inlineData().get();
                if (blob.data().isPresent()) {
                  Files.write(Paths.get("butterfly.png"), blob.data().get());
                }
              }
            }
          }
        }
    }

### REST

    curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{"parts": [{"text": "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {
          "responseModalities": ["TEXT", "IMAGE"],
          "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}
        }
      }' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | head -1 | base64 --decode > butterfly.png

The following is an example image generated from this prompt:
![AI-generated Da Vinci style anatomical sketch of a dissected Monarch butterfly.](https://ai.google.dev/static/gemini-api/docs/images/gemini3-4k-image.png)AI-generated Da Vinci style anatomical sketch of a dissected Monarch butterfly.

### Thinking Process

The Gemini 3 Pro Image Preview model is a thinking model and uses a reasoning process ("Thinking") for complex prompts. This feature is enabled by default and cannot be disabled in the API. To learn more about the thinking process, see the[Gemini Thinking](https://ai.google.dev/gemini-api/docs/thinking)guide.

The model generates up to two interim images to test composition and logic. The last image within Thinking is also the final rendered image.

You can check the thoughts that lead to the final image being produced.  

### Python

    for part in response.parts:
        if part.thought:
            if part.text:
                print(part.text)
            elif image:= part.as_image():
                image.show()

### Javascript

    for (const part of response.candidates[0].content.parts) {
      if (part.thought) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, 'base64');
          fs.writeFileSync('image.png', buffer);
          console.log('Image saved as image.png');
        }
      }
    }

#### Thought Signatures

Thought signatures are encrypted representations of the model's internal thought process and are used to preserve reasoning context across multi-turn interactions. All responses include a`thought_signature`field. As a general rule, if you receive a thought signature in a model response, you should pass it back exactly as received when sending the conversation history in the next turn. Failure to circulate thought signatures may cause the response to fail. Check the[thought signature](https://ai.google.dev/gemini-api/docs/thought-signatures)documentation for more explanations of signatures overall.
| **Note:** If you use the official[Google Gen AI SDKs](https://ai.google.dev/gemini-api/docs/libraries)and use the chat feature (or append the full model response object directly to history),**thought signatures are handled automatically**. You do not need to manually extract or manage them, or change your code.

Here is how thought signatures work:

- All`inline_data`parts with image`mimetype`which are part of the response should have signature.
- If there are some text parts at the beginning (before any image) right after the thoughts, the first text part should also have a signature.
- Thoughts do not have signatures; If`inline_data`parts with image`mimetype`are part of thoughts, they will not have signatures.

The following code shows an example of where thought signatures are included:  

    [
      {
        "inline_data": {
          "data": "<base64_image_data_0>",
          "mime_type": "image/png"
        },
        "thought": true // Thoughts don't have signatures
      },
      {
        "inline_data": {
          "data": "<base64_image_data_1>",
          "mime_type": "image/png"
        },
        "thought": true // Thoughts don't have signatures
      },
      {
        "inline_data": {
          "data": "<base64_image_data_2>",
          "mime_type": "image/png"
        },
        "thought": true // Thoughts don't have signatures
      },
      {
        "text": "Here is a step-by-step guide to baking macarons, presented in three separate images.\n\n### Step 1: Piping the Batter\n\nThe first step after making your macaron batter is to pipe it onto a baking sheet. This requires a steady hand to create uniform circles.\n\n",
        "thought_signature": "<Signature_A>" // The first non-thought part always has a signature
      },
      {
        "inline_data": {
          "data": "<base64_image_data_3>",
          "mime_type": "image/png"
        },
        "thought_signature": "<Signature_B>" // All image parts have a signatures
      },
      {
        "text": "\n\n### Step 2: Baking and Developing Feet\n\nOnce piped, the macarons are baked in the oven. A key sign of a successful bake is the development of \"feet\"---the ruffled edge at the base of each macaron shell.\n\n"
        // Follow-up text parts don't have signatures
      },
      {
        "inline_data": {
          "data": "<base64_image_data_4>",
          "mime_type": "image/png"
        },
        "thought_signature": "<Signature_C>" // All image parts have a signatures
      },
      {
        "text": "\n\n### Step 3: Assembling the Macaron\n\nThe final step is to pair the cooled macaron shells by size and sandwich them together with your desired filling, creating the classic macaron dessert.\n\n"
      },
      {
        "inline_data": {
          "data": "<base64_image_data_5>",
          "mime_type": "image/png"
        },
        "thought_signature": "<Signature_D>" // All image parts have a signatures
      }
    ]

## Other image generation modes

Gemini supports other image interaction modes based on prompt structure and context, including:

- **Text to image(s) and text (interleaved):** Outputs images with related text.
  - Example prompt: "Generate an illustrated recipe for a paella."
- **Image(s) and text to image(s) and text (interleaved)** : Uses input images and text to create new related images and text.
  - Example prompt: (With an image of a furnished room) "What other color sofas would work in my space? can you update the image?"

## Generate images in batch

If you need to generate a lot of images, you can use the[batch API](https://ai.google.dev/gemini-api/docs/models/batch-api). You get higher[rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)in exchange for a turnaround of up to 24 hours.

You can either use inline requests for small batches of requests (under 20MB) or a JSONL input file for large batches (recommended for image generation):

Inline requestsInput file  

### Python

    import json
    import time
    import base64
    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # 1. Create and upload file
    file_name = "my-batch-image-requests.jsonl"
    with open(file_name, "w") as f:
        requests = [
            {"key": "request-1", "request": {"contents": [{"parts": [{"text": "A big letter A surrounded by animals starting with the A letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}},
            {"key": "request-2", "request": {"contents": [{"parts": [{"text": "A big letter B surrounded by animals starting with the B letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}
        ]
        for req in requests:
            f.write(json.dumps(req) + "\n")

    uploaded_file = client.files.upload(
        file=file_name,
        config=types.UploadFileConfig(display_name='my-batch-image-requests', mime_type='jsonl')
    )
    print(f"Uploaded file: {uploaded_file.name}")

    # 2. Create batch job
    file_batch_job = client.batches.create(
        model="gemini-2.5-flash-image",
        src=uploaded_file.name,
        config={
            'display_name': "file-image-upload-job-1",
        },
    )
    print(f"Created batch job: {file_batch_job.name}")

    # 3. Monitor job status
    job_name = file_batch_job.name
    print(f"Polling status for job: {job_name}")

    completed_states = set([
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED',
    ])

    batch_job = client.batches.get(name=job_name) # Initial get
    while batch_job.state.name not in completed_states:
      print(f"Current state: {batch_job.state.name}")
      time.sleep(10) # Wait for 10 seconds before polling again
      batch_job = client.batches.get(name=job_name)

    print(f"Job finished with state: {batch_job.state.name}")

    # 4. Retrieve results
    if batch_job.state.name == 'JOB_STATE_SUCCEEDED':
        result_file_name = batch_job.dest.file_name
        print(f"Results are in file: {result_file_name}")
        print("Downloading result file content...")
        file_content_bytes = client.files.download(file=result_file_name)
        file_content = file_content_bytes.decode('utf-8')
        # The result file is also a JSONL file. Parse and print each line.
        for line in file_content.splitlines():
          if line:
            parsed_response = json.loads(line)
            if 'response' in parsed_response and parsed_response['response']:
                for part in parsed_response['response']['candidates'][0]['content']['parts']:
                  if part.get('text'):
                    print(part['text'])
                  elif part.get('inlineData'):
                    print(f"Image mime type: {part['inlineData']['mimeType']}")
                    data = base64.b64decode(part['inlineData']['data'])
            elif 'error' in parsed_response:
                print(f"Error: {parsed_response['error']}")
    elif batch_job.state.name == 'JOB_STATE_FAILED':
        print(f"Error: {batch_job.error}")

### JavaScript

    import {GoogleGenAI} from '@google/genai';
    import * as fs from "fs";
    import * as path from "path";
    import { fileURLToPath } from 'url';

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

    async function run() {
        // 1. Create and upload file
        const fileName = "my-batch-image-requests.jsonl";
        const requests = [
            { "key": "request-1", "request": { "contents": [{ "parts": [{ "text": "A big letter A surrounded by animals starting with the A letter" }] }], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]} } },
            { "key": "request-2", "request": { "contents": [{ "parts": [{ "text": "A big letter B surrounded by animals starting with the B letter" }] }], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]} } }
        ];
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filePath = path.join(__dirname, fileName);

        try {
            const writeStream = fs.createWriteStream(filePath, { flags: 'w' });
            for (const req of requests) {
                writeStream.write(JSON.stringify(req) + '\n');
            }
            writeStream.end();
            console.log(`Successfully wrote batch requests to ${filePath}`);
        } catch (error) {
            console.error(`An unexpected error occurred writing file:`, error);
            return;
        }

        const uploadedFile = await ai.files.upload({file: fileName, config: { mimeType: 'jsonl' }});
        console.log(`Uploaded file: ${uploadedFile.name}`);

        // 2. Create batch job
        const fileBatchJob = await ai.batches.create({
            model: 'gemini-2.5-flash-image',
            src: uploadedFile.name,
            config: {
                displayName: 'file-image-upload-job-1',
            }
        });
        console.log(fileBatchJob);

        // 3. Monitor job status
        let batchJob;
        const completedStates = new Set([
            'JOB_STATE_SUCCEEDED',
            'JOB_STATE_FAILED',
            'JOB_STATE_CANCELLED',
            'JOB_STATE_EXPIRED',
        ]);

        try {
            batchJob = await ai.batches.get({name: fileBatchJob.name});
            while (!completedStates.has(batchJob.state)) {
                console.log(`Current state: ${batchJob.state}`);
                // Wait for 10 seconds before polling again
                await new Promise(resolve => setTimeout(resolve, 10000));
                batchJob = await ai.batches.get({ name: batchJob.name });
            }
            console.log(`Job finished with state: ${batchJob.state}`);
        } catch (error) {
            console.error(`An error occurred while polling job ${fileBatchJob.name}:`, error);
            return;
        }

        // 4. Retrieve results
        if (batchJob.state === 'JOB_STATE_SUCCEEDED') {
            if (batchJob.dest?.fileName) {
                const resultFileName = batchJob.dest.fileName;
                console.log(`Results are in file: ${resultFileName}`);
                console.log("Downloading result file content...");
                const fileContentBuffer = await ai.files.download({ file: resultFileName });
                const fileContent = fileContentBuffer.toString('utf-8');
                for (const line of fileContent.split('\n')) {
                    if (line) {
                        const parsedResponse = JSON.parse(line);
                        if (parsedResponse.response) {
                            for (const part of parsedResponse.response.candidates[0].content.parts) {
                                if (part.text) {
                                    console.log(part.text);
                                } else if (part.inlineData) {
                                    console.log(`Image mime type: ${part.inlineData.mimeType}`);
                                }
                            }
                        } else if (parsedResponse.error) {
                            console.error(`Error: ${parsedResponse.error}`);
                        }
                    }
                }
            } else {
                console.log("No result file found.");
            }
        } else if (batchJob.state === 'JOB_STATE_FAILED') {
             console.error(`Error: ${typeof batchJob.error === 'string' ? batchJob.error : batchJob.error.message || JSON.stringify(batchJob.error)}`);
        }
    }
    run();

### REST

    # 1. Create and upload file
    echo '{"key": "request-1", "request": {"contents": [{"parts": [{"text": "A big letter A surrounded by animals starting with the A letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}' > my-batch-image-requests.jsonl
    echo '{"key": "request-2", "request": {"contents": [{"parts": [{"text": "A big letter B surrounded by animals starting with the B letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}' >> my-batch-image-requests.jsonl

    # Follow File API guide to upload: https://ai.google.dev/gemini-api/docs/files#upload_a_file
    # This example assumes you have uploaded the file and set BATCH_INPUT_FILE to its name (e.g., files/abcdef123)
    BATCH_INPUT_FILE="files/your-uploaded-file-name"

    # 2. Create batch job
    printf -v request_data '{
        "batch": {
            "display_name": "my-batch-file-image-requests",
            "input_config": { "file_name": "%s" }
        }
    }' "$BATCH_INPUT_FILE"
    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:batchGenerateContent \
      -X POST \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type:application/json" \
      -d "$request_data" > created_batch.json

    BATCH_NAME=$(jq -r '.name' created_batch.json)
    echo "Created batch job: $BATCH_NAME"

    # 3. Poll job status until completion by repeating the following command:
    curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type:application/json" > batch_status.json

    echo "Current status:"
    jq '.' batch_status.json

    # 4. If state is JOB_STATE_SUCCEEDED, download results file
    batch_state=$(jq -r '.state' batch_status.json)
    if [[ $batch_state = "JOB_STATE_SUCCEEDED" ]]; then
        responses_file_name=$(jq -r '.dest.fileName' batch_status.json)
        echo "Job succeeded. Downloading results from $responses_file_name..."
        curl https://generativelanguage.googleapis.com/download/v1beta/$responses_file_name:download?alt=media \
          -H "x-goog-api-key: $GEMINI_API_KEY" > batch_results.jsonl
        echo "Results saved to batch_results.jsonl"
    fi

Check the[documentation](https://ai.google.dev/gemini-api/docs/models/batch-api)and the[cookbook](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Batch_mode.ipynb)for more details on the batch API.

## Prompting guide and strategies

Mastering image generation starts with one fundamental principle:
> **Describe the scene, don't just list keywords.**The model's core strength is its deep language understanding. A narrative, descriptive paragraph will almost always produce a better, more coherent image than a list of disconnected words.

### Prompts for generating images

The following strategies will help you create effective prompts to generate exactly the images you're looking for.

#### 1. Photorealistic scenes

For realistic images, use photography terms. Mention camera angles, lens types, lighting, and fine details to guide the model toward a photorealistic result.  

### Template

    A photorealistic [shot type] of [subject], [action or expression], set in
    [environment]. The scene is illuminated by [lighting description], creating
    a [mood] atmosphere. Captured with a [camera/lens details], emphasizing
    [key textures and details]. The image should be in a [aspect ratio] format.

### Prompt

    A photorealistic close-up portrait of an elderly Japanese ceramicist with
    deep, sun-etched wrinkles and a warm, knowing smile. He is carefully
    inspecting a freshly glazed tea bowl. The setting is his rustic,
    sun-drenched workshop. The scene is illuminated by soft, golden hour light
    streaming through a window, highlighting the fine texture of the clay.
    Captured with an 85mm portrait lens, resulting in a soft, blurred background
    (bokeh). The overall mood is serene and masterful. Vertical portrait
    orientation.

### Python

    from google import genai
    from google.genai import types    

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents="A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay and the fabric of his apron. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful.",
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("photorealistic_example.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class PhotorealisticScene {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              """
              A photorealistic close-up portrait of an elderly Japanese ceramicist
              with deep, sun-etched wrinkles and a warm, knowing smile. He is
              carefully inspecting a freshly glazed tea bowl. The setting is his
              rustic, sun-drenched workshop with pottery wheels and shelves of
              clay pots in the background. The scene is illuminated by soft,
              golden hour light streaming through a window, highlighting the
              fine texture of the clay and the fabric of his apron. Captured
              with an 85mm portrait lens, resulting in a soft, blurred
              background (bokeh). The overall mood is serene and masterful.
              """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("photorealistic_example.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay and the fabric of his apron. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("photorealistic_example.png", buffer);
          console.log("Image saved as photorealistic_example.png");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-2.5-flash-image",
            genai.Text("A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay and the fabric of his apron. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful."),
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "photorealistic_example.png"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay and the fabric of his apron. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful."}
          ]
        }]
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > photorealistic_example.png

![A photorealistic close-up portrait of an elderly Japanese ceramicist...](https://ai.google.dev/static/gemini-api/docs/images/photorealistic_example.png)A photorealistic close-up portrait of an elderly Japanese ceramicist...

#### 2. Stylized illustrations \& stickers

To create stickers, icons, or assets, be explicit about the style and request a transparent background.  

### Template

    A [style] sticker of a [subject], featuring [key characteristics] and a
    [color palette]. The design should have [line style] and [shading style].
    The background must be transparent.

### Prompt

    A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It's
    munching on a green bamboo leaf. The design features bold, clean outlines,
    simple cel-shading, and a vibrant color palette. The background must be white.

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents="A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It's munching on a green bamboo leaf. The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white.",
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("red_panda_sticker.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class StylizedIllustration {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              """
              A kawaii-style sticker of a happy red panda wearing a tiny bamboo
              hat. It's munching on a green bamboo leaf. The design features
              bold, clean outlines, simple cel-shading, and a vibrant color
              palette. The background must be white.
              """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("red_panda_sticker.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It's munching on a green bamboo leaf. The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("red_panda_sticker.png", buffer);
          console.log("Image saved as red_panda_sticker.png");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-2.5-flash-image",
            genai.Text("A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It's munching on a green bamboo leaf. The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white."),
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "red_panda_sticker.png"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat. It'"'"'s munching on a green bamboo leaf. The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white."}
          ]
        }]
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > red_panda_sticker.png

![A kawaii-style sticker of a happy red...](https://ai.google.dev/static/gemini-api/docs/images/red_panda_sticker.png)A kawaii-style sticker of a happy red panda...

#### 3. Accurate text in images

Gemini excels at rendering text. Be clear about the text, the font style (descriptively), and the overall design. Use Gemini 3 Pro Image Preview for professional asset production.  

### Template

    Create a [image type] for [brand/concept] with the text "[text to render]"
    in a [font style]. The design should be [style description], with a
    [color scheme].

### Prompt

    Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way.

### Python

    from google import genai
    from google.genai import types    

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents="Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way.",
        config=types.GenerateContentConfig(
            image_config=types.ImageConfig(
                aspect_ratio="1:1",
            )
        )
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("logo_example.jpg")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;
    import com.google.genai.types.ImageConfig;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class AccurateTextInImages {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .imageConfig(ImageConfig.builder()
                  .aspectRatio("1:1")
                  .build())
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview",
              """
              Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way.
              """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("logo_example.jpg"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way.";

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });
      for (const part of response.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("logo_example.jpg", buffer);
          console.log("Image saved as logo_example.jpg");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-3-pro-image-preview",
            genai.Text("Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way."),
            &genai.GenerateContentConfig{
                ImageConfig: &genai.ImageConfig{
                  AspectRatio: "1:1",
                },
            },
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "logo_example.jpg"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "Create a modern, minimalist logo for a coffee shop called '"'"'The Daily Grind'"'"'. The text should be in a clean, bold, sans-serif font. The color scheme is black and white. Put the logo in a circle. Use a coffee bean in a clever way."}
          ]
        }],
        "generationConfig": {
          "imageConfig": {
            "aspectRatio": "1:1"
          }
        }
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > logo_example.jpg

![Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'...](https://ai.google.dev/static/gemini-api/docs/images/logo_example.jpg)Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'...

#### 4. Product mockups \& commercial photography

Perfect for creating clean, professional product shots for e-commerce, advertising, or branding.  

### Template

    A high-resolution, studio-lit product photograph of a [product description]
    on a [background surface/description]. The lighting is a [lighting setup,
    e.g., three-point softbox setup] to [lighting purpose]. The camera angle is
    a [angle type] to showcase [specific feature]. Ultra-realistic, with sharp
    focus on [key detail]. [Aspect ratio].

### Prompt

    A high-resolution, studio-lit product photograph of a minimalist ceramic
    coffee mug in matte black, presented on a polished concrete surface. The
    lighting is a three-point softbox setup designed to create soft, diffused
    highlights and eliminate harsh shadows. The camera angle is a slightly
    elevated 45-degree shot to showcase its clean lines. Ultra-realistic, with
    sharp focus on the steam rising from the coffee. Square image.

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents="A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug in matte black, presented on a polished concrete surface. The lighting is a three-point softbox setup designed to create soft, diffused highlights and eliminate harsh shadows. The camera angle is a slightly elevated 45-degree shot to showcase its clean lines. Ultra-realistic, with sharp focus on the steam rising from the coffee. Square image.",
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("product_mockup.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class ProductMockup {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              """
              A high-resolution, studio-lit product photograph of a minimalist
              ceramic coffee mug in matte black, presented on a polished
              concrete surface. The lighting is a three-point softbox setup
              designed to create soft, diffused highlights and eliminate harsh
              shadows. The camera angle is a slightly elevated 45-degree shot
              to showcase its clean lines. Ultra-realistic, with sharp focus
              on the steam rising from the coffee. Square image.
              """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("product_mockup.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug in matte black, presented on a polished concrete surface. The lighting is a three-point softbox setup designed to create soft, diffused highlights and eliminate harsh shadows. The camera angle is a slightly elevated 45-degree shot to showcase its clean lines. Ultra-realistic, with sharp focus on the steam rising from the coffee. Square image.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("product_mockup.png", buffer);
          console.log("Image saved as product_mockup.png");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-2.5-flash-image",
            genai.Text("A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug in matte black, presented on a polished concrete surface. The lighting is a three-point softbox setup designed to create soft, diffused highlights and eliminate harsh shadows. The camera angle is a slightly elevated 45-degree shot to showcase its clean lines. Ultra-realistic, with sharp focus on the steam rising from the coffee. Square image."),
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "product_mockup.png"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug in matte black, presented on a polished concrete surface. The lighting is a three-point softbox setup designed to create soft, diffused highlights and eliminate harsh shadows. The camera angle is a slightly elevated 45-degree shot to showcase its clean lines. Ultra-realistic, with sharp focus on the steam rising from the coffee. Square image."}
          ]
        }]
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > product_mockup.png

![A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug...](https://ai.google.dev/static/gemini-api/docs/images/product_mockup.png)A high-resolution, studio-lit product photograph of a minimalist ceramic coffee mug...

#### 5. Minimalist \& negative space design

Excellent for creating backgrounds for websites, presentations, or marketing materials where text will be overlaid.  

### Template

    A minimalist composition featuring a single [subject] positioned in the
    [bottom-right/top-left/etc.] of the frame. The background is a vast, empty
    [color] canvas, creating significant negative space. Soft, subtle lighting.
    [Aspect ratio].

### Prompt

    A minimalist composition featuring a single, delicate red maple leaf
    positioned in the bottom-right of the frame. The background is a vast, empty
    off-white canvas, creating significant negative space for text. Soft,
    diffused lighting from the top left. Square image.

### Python

    from google import genai
    from google.genai import types    

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents="A minimalist composition featuring a single, delicate red maple leaf positioned in the bottom-right of the frame. The background is a vast, empty off-white canvas, creating significant negative space for text. Soft, diffused lighting from the top left. Square image.",
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("minimalist_design.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Paths;

    public class MinimalistDesign {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              """
              A minimalist composition featuring a single, delicate red maple
              leaf positioned in the bottom-right of the frame. The background
              is a vast, empty off-white canvas, creating significant negative
              space for text. Soft, diffused lighting from the top left.
              Square image.
              """,
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("minimalist_design.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const prompt =
        "A minimalist composition featuring a single, delicate red maple leaf positioned in the bottom-right of the frame. The background is a vast, empty off-white canvas, creating significant negative space for text. Soft, diffused lighting from the top left. Square image.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("minimalist_design.png", buffer);
          console.log("Image saved as minimalist_design.png");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-2.5-flash-image",
            genai.Text("A minimalist composition featuring a single, delicate red maple leaf positioned in the bottom-right of the frame. The background is a vast, empty off-white canvas, creating significant negative space for text. Soft, diffused lighting from the top left. Square image."),
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "minimalist_design.png"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "A minimalist composition featuring a single, delicate red maple leaf positioned in the bottom-right of the frame. The background is a vast, empty off-white canvas, creating significant negative space for text. Soft, diffused lighting from the top left. Square image."}
          ]
        }]
      }' \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > minimalist_design.png

![A minimalist composition featuring a single, delicate red maple leaf...](https://ai.google.dev/static/gemini-api/docs/images/minimalist_design.png)A minimalist composition featuring a single, delicate red maple leaf...

#### 6. Sequential art (Comic panel / Storyboard)

Builds on character consistency and scene description to create panels for visual storytelling. For accuracy with text and storytelling ability, these prompts work best with Gemini 3 Pro Image Preview.  

### Template

    Make a 3 panel comic in a [style]. Put the character in a [type of scene].

### Prompt

    Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene.

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    image_input = Image.open('/path/to/your/man_in_white_glasses.jpg')
    text_input = "Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene."

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[text_input, image_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("comic_panel.jpg")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class ComicPanel {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview",
              Content.fromParts(
                  Part.fromText("""
                      Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene.
                      """),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/man_in_white_glasses.jpg")),
                      "image/jpeg")),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("comic_panel.jpg"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/man_in_white_glasses.jpg";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        {text: "Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene."},
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("comic_panel.jpg", buffer);
          console.log("Image saved as comic_panel.jpg");
        }
      }
    }

    main();

### Go

    package main

    import (
        "context"
        "fmt"
        "log"
        "os"
        "google.golang.org/genai"
    )

    func main() {

        ctx := context.Background()
        client, err := genai.NewClient(ctx, nil)
        if err != nil {
            log.Fatal(err)
        }

        imagePath := "/path/to/your/man_in_white_glasses.jpg"
        imgData, _ := os.ReadFile(imagePath)

        parts := []*genai.Part{
          genai.NewPartFromText("Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene."),
          &genai.Part{
            InlineData: &genai.Blob{
              MIMEType: "image/jpeg",
              Data:     imgData,
            },
          },
        }

        contents := []*genai.Content{
          genai.NewContentFromParts(parts, genai.RoleUser),
        }

        result, _ := client.Models.GenerateContent(
            ctx,
            "gemini-3-pro-image-preview",
            contents,
        )

        for _, part := range result.Candidates[0].Content.Parts {
            if part.Text != "" {
                fmt.Println(part.Text)
            } else if part.InlineData != nil {
                imageBytes := part.InlineData.Data
                outputFilename := "comic_panel.jpg"
                _ = os.WriteFile(outputFilename, imageBytes, 0644)
            }
        }
    }

### REST

    IMG_PATH=/path/to/your/man_in_white_glasses.jpg

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -s -X POST
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"contents\": [{
          \"parts\": [
            {\"text\": \"Make a 3 panel comic in a gritty, noir art style with high-contrast black and white inks. Put the character in a humurous scene.\"},
            {\"inline_data\": {\"mime_type\":\"image/jpeg\", \"data\": \"$IMG_BASE64\"}}
          ]
        }]
      }" \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > comic_panel.jpg

|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input                                                                                                            | Output                                                                                                                                                                         |
| ![Man in white glasses](https://ai.google.dev/static/gemini-api/docs/images/man_in_white_glasses.jpg)Input image | ![Make a 3 panel comic in a gritty, noir art style...](https://ai.google.dev/static/gemini-api/docs/images/comic_panel.jpg)Make a 3 panel comic in a gritty, noir art style... |

### Prompts for editing images

These examples show how to provide images alongside your text prompts for editing, composition, and style transfer.

#### 1. Adding and removing elements

Provide an image and describe your change. The model will match the original image's style, lighting, and perspective.  

### Template

    Using the provided image of [subject], please [add/remove/modify] [element]
    to/from the scene. Ensure the change is [description of how the change should
    integrate].

### Prompt

    "Using the provided image of my cat, please add a small, knitted wizard hat
    on its head. Make it look like it's sitting comfortably and matches the soft
    lighting of the photo."

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # Base image prompt: "A photorealistic picture of a fluffy ginger cat sitting on a wooden floor, looking directly at the camera. Soft, natural light from a window."
    image_input = Image.open('/path/to/your/cat_photo.png')
    text_input = """Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it's sitting comfortably and not falling off."""

    # Generate an image from a text prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[text_input, image_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("cat_with_hat.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class AddRemoveElements {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromText("""
                      Using the provided image of my cat, please add a small,
                      knitted wizard hat on its head. Make it look like it's
                      sitting comfortably and not falling off.
                      """),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/cat_photo.png")),
                      "image/png")),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("cat_with_hat.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/cat_photo.png";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        { text: "Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it's sitting comfortably and not falling off." },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("cat_with_hat.png", buffer);
          console.log("Image saved as cat_with_hat.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imagePath := "/path/to/your/cat_photo.png"
      imgData, _ := os.ReadFile(imagePath)

      parts := []*genai.Part{
        genai.NewPartFromText("Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it's sitting comfortably and not falling off."),
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData,
          },
        },
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "cat_with_hat.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH=/path/to/your/cat_photo.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {\"text\": \"Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it's sitting comfortably and not falling off.\"},
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG_BASE64\"
                  }
                }
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > cat_with_hat.png

|---------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input                                                   | Output                                                                                                                                                                                                                              |
| :cat:A photorealistic picture of a fluffy ginger cat... | ![Using the provided image of my cat, please add a small, knitted wizard hat...](https://ai.google.dev/static/gemini-api/docs/images/cat_with_hat.png)Using the provided image of my cat, please add a small, knitted wizard hat... |

#### 2. Inpainting (Semantic masking)

Conversationally define a "mask" to edit a specific part of an image while leaving the rest untouched.  

### Template

    Using the provided image, change only the [specific element] to [new
    element/description]. Keep everything else in the image exactly the same,
    preserving the original style, lighting, and composition.

### Prompt

    "Using the provided image of a living room, change only the blue sofa to be
    a vintage, brown leather chesterfield sofa. Keep the rest of the room,
    including the pillows on the sofa and the lighting, unchanged."

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # Base image prompt: "A wide shot of a modern, well-lit living room with a prominent blue sofa in the center. A coffee table is in front of it and a large window is in the background."
    living_room_image = Image.open('/path/to/your/living_room.png')
    text_input = """Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged."""

    # Generate an image from a text prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[living_room_image, text_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("living_room_edited.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class Inpainting {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/living_room.png")),
                      "image/png"),
                  Part.fromText("""
                      Using the provided image of a living room, change
                      only the blue sofa to be a vintage, brown leather
                      chesterfield sofa. Keep the rest of the room,
                      including the pillows on the sofa and the lighting,
                      unchanged.
                      """)),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("living_room_edited.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/living_room.png";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
        { text: "Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged." },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("living_room_edited.png", buffer);
          console.log("Image saved as living_room_edited.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imagePath := "/path/to/your/living_room.png"
      imgData, _ := os.ReadFile(imagePath)

      parts := []*genai.Part{
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData,
          },
        },
        genai.NewPartFromText("Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged."),
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "living_room_edited.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH=/path/to/your/living_room.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG_BASE64\"
                  }
                },
                {\"text\": \"Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged.\"}
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > living_room_edited.png

|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input                                                                                                                                                                    | Output                                                                                                                                                                                                                                                                                                                          |
| ![A wide shot of a modern, well-lit living room...](https://ai.google.dev/static/gemini-api/docs/images/living_room.png)A wide shot of a modern, well-lit living room... | ![Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa...](https://ai.google.dev/static/gemini-api/docs/images/living_room_edited.png)Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa... |

#### 3. Style transfer

Provide an image and ask the model to recreate its content in a different artistic style.  

### Template

    Transform the provided photograph of [subject] into the artistic style of [artist/art style]. Preserve the original composition but render it with [description of stylistic elements].

### Prompt

    "Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows."

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # Base image prompt: "A photorealistic, high-resolution photograph of a busy city street in New York at night, with bright neon signs, yellow taxis, and tall skyscrapers."
    city_image = Image.open('/path/to/your/city.png')
    text_input = """Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows."""

    # Generate an image from a text prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[city_image, text_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("city_style_transfer.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class StyleTransfer {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/city.png")),
                      "image/png"),
                  Part.fromText("""
                      Transform the provided photograph of a modern city
                      street at night into the artistic style of
                      Vincent van Gogh's 'Starry Night'. Preserve the
                      original composition of buildings and cars, but
                      render all elements with swirling, impasto
                      brushstrokes and a dramatic palette of deep blues
                      and bright yellows.
                      """)),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("city_style_transfer.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/city.png";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
        { text: "Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows." },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("city_style_transfer.png", buffer);
          console.log("Image saved as city_style_transfer.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imagePath := "/path/to/your/city.png"
      imgData, _ := os.ReadFile(imagePath)

      parts := []*genai.Part{
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData,
          },
        },
        genai.NewPartFromText("Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows."),
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "city_style_transfer.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH=/path/to/your/city.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG_BASE64\"
                  }
                },
                {\"text\": \"Transform the provided photograph of a modern city street at night into the artistic style of Vincent van Gogh's 'Starry Night'. Preserve the original composition of buildings and cars, but render all elements with swirling, impasto brushstrokes and a dramatic palette of deep blues and bright yellows.\"}
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > city_style_transfer.png

|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input                                                                                                                                                                                                       | Output                                                                                                                                                                                                                     |
| ![A photorealistic, high-resolution photograph of a busy city street...](https://ai.google.dev/static/gemini-api/docs/images/city.png)A photorealistic, high-resolution photograph of a busy city street... | ![Transform the provided photograph of a modern city street at night...](https://ai.google.dev/static/gemini-api/docs/images/city_style_transfer.png)Transform the provided photograph of a modern city street at night... |

#### 4. Advanced composition: Combining multiple images

Provide multiple images as context to create a new, composite scene. This is perfect for product mockups or creative collages.  

### Template

    Create a new image by combining the elements from the provided images. Take
    the [element from image 1] and place it with/on the [element from image 2].
    The final image should be a [description of the final scene].

### Prompt

    "Create a professional e-commerce fashion photo. Take the blue floral dress
    from the first image and let the woman from the second image wear it.
    Generate a realistic, full-body shot of the woman wearing the dress, with
    the lighting and shadows adjusted to match the outdoor environment."

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # Base image prompts:
    # 1. Dress: "A professionally shot photo of a blue floral summer dress on a plain white background, ghost mannequin style."
    # 2. Model: "Full-body shot of a woman with her hair in a bun, smiling, standing against a neutral grey studio background."
    dress_image = Image.open('/path/to/your/dress.png')
    model_image = Image.open('/path/to/your/model.png')

    text_input = """Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment."""

    # Generate an image from a text prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[dress_image, model_image, text_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("fashion_ecommerce_shot.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class AdvancedComposition {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/dress.png")),
                      "image/png"),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/model.png")),
                      "image/png"),
                  Part.fromText("""
                      Create a professional e-commerce fashion photo.
                      Take the blue floral dress from the first image and
                      let the woman from the second image wear it. Generate
                      a realistic, full-body shot of the woman wearing the
                      dress, with the lighting and shadows adjusted to
                      match the outdoor environment.
                      """)),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("fashion_ecommerce_shot.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath1 = "/path/to/your/dress.png";
      const imageData1 = fs.readFileSync(imagePath1);
      const base64Image1 = imageData1.toString("base64");
      const imagePath2 = "/path/to/your/model.png";
      const imageData2 = fs.readFileSync(imagePath2);
      const base64Image2 = imageData2.toString("base64");

      const prompt = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image1,
          },
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image2,
          },
        },
        { text: "Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment." },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("fashion_ecommerce_shot.png", buffer);
          console.log("Image saved as fashion_ecommerce_shot.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imgData1, _ := os.ReadFile("/path/to/your/dress.png")
      imgData2, _ := os.ReadFile("/path/to/your/model.png")

      parts := []*genai.Part{
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData1,
          },
        },
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData2,
          },
        },
        genai.NewPartFromText("Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment."),
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "fashion_ecommerce_shot.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH1=/path/to/your/dress.png
    IMG_PATH2=/path/to/your/model.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG1_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH1" 2>&1)
    IMG2_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH2" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG1_BASE64\"
                  }
                },
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG2_BASE64\"
                  }
                },
                {\"text\": \"Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment.\"}
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > fashion_ecommerce_shot.png

|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input 1                                                             | Input 2                                                                                                                                                                  | Output                                                                                                                                                                                |
| :dress:A professionally shot photo of a blue floral summer dress... | ![Full-body shot of a woman with her hair in a bun...](https://ai.google.dev/static/gemini-api/docs/images/model.png)Full-body shot of a woman with her hair in a bun... | ![Create a professional e-commerce fashion photo...](https://ai.google.dev/static/gemini-api/docs/images/fashion_ecommerce_shot.png)Create a professional e-commerce fashion photo... |

#### 5. High-fidelity detail preservation

To ensure critical details (like a face or logo) are preserved during an edit, describe them in great detail along with your edit request.  

### Template

    Using the provided images, place [element from image 2] onto [element from
    image 1]. Ensure that the features of [element from image 1] remain
    completely unchanged. The added element should [description of how the
    element should integrate].

### Prompt

    "Take the first image of the woman with brown hair, blue eyes, and a neutral
    expression. Add the logo from the second image onto her black t-shirt.
    Ensure the woman's face and features remain completely unchanged. The logo
    should look like it's naturally printed on the fabric, following the folds
    of the shirt."

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    # Base image prompts:
    # 1. Woman: "A professional headshot of a woman with brown hair and blue eyes, wearing a plain black t-shirt, against a neutral studio background."
    # 2. Logo: "A simple, modern logo with the letters 'G' and 'A' in a white circle."
    woman_image = Image.open('/path/to/your/woman.png')
    logo_image = Image.open('/path/to/your/logo.png')
    text_input = """Take the first image of the woman with brown hair, blue eyes, and a neutral expression. Add the logo from the second image onto her black t-shirt. Ensure the woman's face and features remain completely unchanged. The logo should look like it's naturally printed on the fabric, following the folds of the shirt."""

    # Generate an image from a text prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[woman_image, logo_image, text_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("woman_with_logo.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class HighFidelity {
      public static void main(String[] args) throws IOException {

        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-2.5-flash-image",
              Content.fromParts(
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/woman.png")),
                      "image/png"),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/logo.png")),
                      "image/png"),
                  Part.fromText("""
                      Take the first image of the woman with brown hair,
                      blue eyes, and a neutral expression. Add the logo
                      from the second image onto her black t-shirt.
                      Ensure the woman's face and features remain
                      completely unchanged. The logo should look like
                      it's naturally printed on the fabric, following
                      the folds of the shirt.
                      """)),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("woman_with_logo.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath1 = "/path/to/your/woman.png";
      const imageData1 = fs.readFileSync(imagePath1);
      const base64Image1 = imageData1.toString("base64");
      const imagePath2 = "/path/to/your/logo.png";
      const imageData2 = fs.readFileSync(imagePath2);
      const base64Image2 = imageData2.toString("base64");

      const prompt = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image1,
          },
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image2,
          },
        },
        { text: "Take the first image of the woman with brown hair, blue eyes, and a neutral expression. Add the logo from the second image onto her black t-shirt. Ensure the woman's face and features remain completely unchanged. The logo should look like it's naturally printed on the fabric, following the folds of the shirt." },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("woman_with_logo.png", buffer);
          console.log("Image saved as woman_with_logo.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imgData1, _ := os.ReadFile("/path/to/your/woman.png")
      imgData2, _ := os.ReadFile("/path/to/your/logo.png")

      parts := []*genai.Part{
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData1,
          },
        },
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData2,
          },
        },
        genai.NewPartFromText("Take the first image of the woman with brown hair, blue eyes, and a neutral expression. Add the logo from the second image onto her black t-shirt. Ensure the woman's face and features remain completely unchanged. The logo should look like it's naturally printed on the fabric, following the folds of the shirt."),
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-2.5-flash-image",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "woman_with_logo.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH1=/path/to/your/woman.png
    IMG_PATH2=/path/to/your/logo.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG1_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH1" 2>&1)
    IMG2_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH2" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG1_BASE64\"
                  }
                },
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG2_BASE64\"
                  }
                },
                {\"text\": \"Take the first image of the woman with brown hair, blue eyes, and a neutral expression. Add the logo from the second image onto her black t-shirt. Ensure the woman's face and features remain completely unchanged. The logo should look like it's naturally printed on the fabric, following the folds of the shirt.\"}
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > woman_with_logo.png

|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input 1                                                                    | Input 2                                                                                                                                                                     | Output                                                                                                                                                                                                                                                         |
| :woman:A professional headshot of a woman with brown hair and blue eyes... | ![A simple, modern logo with the letters 'G' and 'A'...](https://ai.google.dev/static/gemini-api/docs/images/logo.png)A simple, modern logo with the letters 'G' and 'A'... | ![Take the first image of the woman with brown hair, blue eyes, and a neutral expression...](https://ai.google.dev/static/gemini-api/docs/images/woman_with_logo.png)Take the first image of the woman with brown hair, blue eyes, and a neutral expression... |

#### 6. Bring something to life

Upload a rough sketch or drawing and ask the model to refine it into a finished image.  

### Template

    Turn this rough [medium] sketch of a [subject] into a [style description]
    photo. Keep the [specific features] from the sketch but add [new details/materials].

### Prompt

    "Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting."

### Python

    from google import genai
    from PIL import Image

    client = genai.Client()

    # Base image prompt: "A rough pencil sketch of a flat sports car on white paper."
    sketch_image = Image.open('/path/to/your/car_sketch.png')
    text_input = """Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting."""

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[sketch_image, text_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("car_photo.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class BringToLife {
      public static void main(String[] args) throws IOException {
        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview",
              Content.fromParts(
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/car_sketch.png")),
                      "image/png"),
                  Part.fromText("""
                      Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting.
                      """)),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("car_photo.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/car_sketch.png";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
        { text: "Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting." },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
      });
      for (const part of response.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("car_photo.png", buffer);
          console.log("Image saved as car_photo.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imgData, _ := os.ReadFile("/path/to/your/car_sketch.png")

      parts := []*genai.Part{
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/png",
            Data:     imgData,
          },
        },
        genai.NewPartFromText("Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting."),
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-pro-image-preview",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "car_photo.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH=/path/to/your/car_sketch.png

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/png\",
                    \"data\": \"$IMG_BASE64\"
                  }
                },
                {\"text\": \"Turn this rough pencil sketch of a futuristic car into a polished photo of the finished concept car in a showroom. Keep the sleek lines and low profile from the sketch but add metallic blue paint and neon rim lighting.\"}
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > car_photo.png

|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Input                                                                                                       | Output                                                                                                                            |
| ![Sketch of a car](https://ai.google.dev/static/gemini-api/docs/images/car-sketch.jpg)Rough sketch of a car | ![Output showing the final concept car](https://ai.google.dev/static/gemini-api/docs/images/car-photo.jpg)Polished photo of a car |

#### 7. Character consistency: 360 view

You can generate 360-degree views of a character by iteratively prompting for different angles. For best results, include previously generated images in subsequent prompts to maintain consistency. For complex poses, include a reference image of the desired pose.  

### Template

    A studio portrait of [person] against [background], [looking forward/in profile looking right/etc.]

### Prompt

    A studio portrait of this man against white, in profile looking right

### Python

    from google import genai
    from google.genai import types
    from PIL import Image

    client = genai.Client()

    image_input = Image.open('/path/to/your/man_in_white_glasses.jpg')
    text_input = """A studio portrait of this man against white, in profile looking right"""

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[text_input, image_input],
    )

    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = part.as_image()
            image.save("man_right_profile.png")

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;

    public class CharacterConsistency {
      public static void main(String[] args) throws IOException {
        try (Client client = new Client()) {
          GenerateContentConfig config = GenerateContentConfig.builder()
              .responseModalities("TEXT", "IMAGE")
              .build();

          GenerateContentResponse response = client.models.generateContent(
              "gemini-3-pro-image-preview",
              Content.fromParts(
                  Part.fromText("""
                      A studio portrait of this man against white, in profile looking right
                      """),
                  Part.fromBytes(
                      Files.readAllBytes(
                          Path.of("/path/to/your/man_in_white_glasses.jpg")),
                      "image/jpeg")),
              config);

          for (Part part : response.parts()) {
            if (part.text().isPresent()) {
              System.out.println(part.text().get());
            } else if (part.inlineData().isPresent()) {
              var blob = part.inlineData().get();
              if (blob.data().isPresent()) {
                Files.write(Paths.get("man_right_profile.png"), blob.data().get());
              }
            }
          }
        }
      }
    }

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    async function main() {

      const ai = new GoogleGenAI({});

      const imagePath = "/path/to/your/man_in_white_glasses.jpg";
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString("base64");

      const prompt = [
        { text: "A studio portrait of this man against white, in profile looking right" },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
      });
      for (const part of response.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync("man_right_profile.png", buffer);
          console.log("Image saved as man_right_profile.png");
        }
      }
    }

    main();

### Go

    package main

    import (
      "context"
      "fmt"
      "log"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imagePath := "/path/to/your/man_in_white_glasses.jpg"
      imgData, _ := os.ReadFile(imagePath)

      parts := []*genai.Part{
        genai.NewPartFromText("A studio portrait of this man against white, in profile looking right"),
        &genai.Part{
          InlineData: &genai.Blob{
            MIMEType: "image/jpeg",
            Data:     imgData,
          },
        },
      }

      contents := []*genai.Content{
        genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-pro-image-preview",
          contents,
      )

      for _, part := range result.Candidates[0].Content.Parts {
          if part.Text != "" {
              fmt.Println(part.Text)
          } else if part.InlineData != nil {
              imageBytes := part.InlineData.Data
              outputFilename := "man_right_profile.png"
              _ = os.WriteFile(outputFilename, imageBytes, 0644)
          }
      }
    }

### REST

    IMG_PATH=/path/to/your/man_in_white_glasses.jpg

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    IMG_BASE64=$(base64 "$B64FLAGS" "$IMG_PATH" 2>&1)

    curl -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
          \"contents\": [{
            \"parts\":[
                {\"text\": \"A studio portrait of this man against white, in profile looking right\"},
                {
                  \"inline_data\": {
                    \"mime_type\":\"image/jpeg\",
                    \"data\": \"$IMG_BASE64\"
                  }
                }
            ]
          }]
        }"  \
      | grep -o '"data": "[^"]*"' \
      | cut -d'"' -f4 \
      | base64 --decode > man_right_profile.png

|-----------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input                                                                                                                                   | Output 1                                                                                                                                                                        | Output 2                                                                                                                                                                              |
| ![Original input of a man in white glasses](https://ai.google.dev/static/gemini-api/docs/images/man_in_white_glasses.jpg)Original image | ![Output of a man in white glasses looking right](https://ai.google.dev/static/gemini-api/docs/images/man_in_white_glasses_looking_right.jpg)Man in white glasses looking right | ![Output of a man in white glasses looking forward](https://ai.google.dev/static/gemini-api/docs/images/man_in_white_glasses_looking_forward.jpg)Man in white glasses looking forward |

### Best Practices

To elevate your results from good to great, incorporate these professional strategies into your workflow.

- **Be Hyper-Specific:**The more detail you provide, the more control you have. Instead of "fantasy armor," describe it: "ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings."
- **Provide Context and Intent:** Explain the*purpose*of the image. The model's understanding of context will influence the final output. For example, "Create a logo for a high-end, minimalist skincare brand" will yield better results than just "Create a logo."
- **Iterate and Refine:**Don't expect a perfect image on the first try. Use the conversational nature of the model to make small changes. Follow up with prompts like, "That's great, but can you make the lighting a bit warmer?" or "Keep everything the same, but change the character's expression to be more serious."
- **Use Step-by-Step Instructions:**For complex scenes with many elements, break your prompt into steps. "First, create a background of a serene, misty forest at dawn. Then, in the foreground, add a moss-covered ancient stone altar. Finally, place a single, glowing sword on top of the altar."
- **Use "Semantic Negative Prompts":**Instead of saying "no cars," describe the desired scene positively: "an empty, deserted street with no signs of traffic."
- **Control the Camera:** Use photographic and cinematic language to control the composition. Terms like`wide-angle shot`,`macro shot`,`low-angle
  perspective`.

## Limitations

- For best performance, use the following languages: EN, es-MX, ja-JP, zh-CN, hi-IN.
- Image generation does not support audio or video inputs.
- The model won't always follow the exact number of image outputs that the user explicitly asks for.
- The model works best with up to 3 images as an input.
- When generating text for an image, Gemini works best if you first generate the text and then ask for an image with the text.
- All generated images include a[SynthID watermark](https://ai.google.dev/responsible/docs/safeguards/synthid).

## Optional configurations

You can optionally configure the response modalities and aspect ratio of the model's output in the`config`field of`generate_content`calls.

### Output types

The model defaults to returning text and image responses (i.e.`response_modalities=['Text', 'Image']`). You can configure the response to return only images without text using`response_modalities=['Image']`.  

### Python

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=['Image']
        )
    )

### JavaScript

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
            responseModalities: ['Image']
        }
      });

### Go

    result, _ := client.Models.GenerateContent(
        ctx,
        "gemini-2.5-flash-image",
        genai.Text("Create a picture of a nano banana dish in a " +
                    " fancy restaurant with a Gemini theme"),
        &genai.GenerateContentConfig{
            ResponseModalities: "Image",
        },
      )

### Java

    response = client.models.generateContent(
        "gemini-2.5-flash-image",
        prompt,
        GenerateContentConfig.builder()
            .responseModalities("IMAGE")
            .build());

### REST

    -d '{
      "contents": [{
        "parts": [
          {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
        ]
      }],
      "generationConfig": {
        "responseModalities": ["Image"]
      }
    }' \

### Aspect ratios

The model defaults to matching the output image size to that of your input image, or otherwise generates 1:1 squares. You can control the aspect ratio of the output image using the`aspect_ratio`field under`image_config`in the response request, shown here:  

### Python

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt],
        config=types.GenerateContentConfig(
            image_config=types.ImageConfig(
                aspect_ratio="16:9",
            )
        )
    )

### JavaScript

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        }
      });

### Go

    result, _ := client.Models.GenerateContent(
        ctx,
        "gemini-2.5-flash-image",
        genai.Text("Create a picture of a nano banana dish in a " +
                    " fancy restaurant with a Gemini theme"),
        &genai.GenerateContentConfig{
            ImageConfig: &genai.ImageConfig{
              AspectRatio: "16:9",
            },
        }
      )

### Java

    response = client.models.generateContent(
        "gemini-2.5-flash-image",
        prompt,
        GenerateContentConfig.builder()
            .imageConfig(ImageConfig.builder()
                .aspectRatio("16:9")
                .build())
            .build());

### REST

    -d '{
      "contents": [{
        "parts": [
          {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
        ]
      }],
      "generationConfig": {
        "imageConfig": {
          "aspectRatio": "16:9"
        }
      }
    }' \

The different ratios available and the size of the image generated are listed in the following tables:

**Gemini 2.5 Flash Image**

| Aspect ratio | Resolution | Tokens |
|--------------|------------|--------|
| 1:1          | 1024x1024  | 1290   |
| 2:3          | 832x1248   | 1290   |
| 3:2          | 1248x832   | 1290   |
| 3:4          | 864x1184   | 1290   |
| 4:3          | 1184x864   | 1290   |
| 4:5          | 896x1152   | 1290   |
| 5:4          | 1152x896   | 1290   |
| 9:16         | 768x1344   | 1290   |
| 16:9         | 1344x768   | 1290   |
| 21:9         | 1536x672   | 1290   |

**Gemini 3 Pro Image Preview**

| Aspect ratio | 1K resolution | 1K Tokens | 2K resolution | 2K Tokens | 4K resolution | 4K Tokens |
|--------------|---------------|-----------|---------------|-----------|---------------|-----------|
| **1:1**      | 1024x1024     | 1210      | 2048x2048     | 1210      | 4096x4096     | 2000      |
| **2:3**      | 848x1264      | 1210      | 1696x2528     | 1210      | 3392x5056     | 2000      |
| **3:2**      | 1264x848      | 1210      | 2528x1696     | 1210      | 5056x3392     | 2000      |
| **3:4**      | 896x1200      | 1210      | 1792x2400     | 1210      | 3584x4800     | 2000      |
| **4:3**      | 1200x896      | 1210      | 2400x1792     | 1210      | 4800x3584     | 2000      |
| **4:5**      | 928x1152      | 1210      | 1856x2304     | 1210      | 3712x4608     | 2000      |
| **5:4**      | 1152x928      | 1210      | 2304x1856     | 1210      | 4608x3712     | 2000      |
| **9:16**     | 768x1376      | 1210      | 1536x2752     | 1210      | 3072x5504     | 2000      |
| **16:9**     | 1376x768      | 1210      | 2752x1536     | 1210      | 5504x3072     | 2000      |
| **21:9**     | 1584x672      | 1210      | 3168x1344     | 1210      | 6336x2688     | 2000      |

## When to use Imagen

In addition to using Gemini's built-in image generation capabilities, you can also access[Imagen](https://ai.google.dev/gemini-api/docs/imagen), our specialized image generation model, through the Gemini API.

|     Attribute     |                                                                                                                 Imagen                                                                                                                 |                                                                                                                                                                                               Gemini Native Image                                                                                                                                                                                                |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Strengths         | Model specializes in image generation.                                                                                                                                                                                                 | **Default recommendation.** Unparalleled flexibility, contextual understanding, and simple, mask-free editing. Uniquely capable of multi-turn conversational editing.                                                                                                                                                                                                                                            |
| Availability      | Generally available                                                                                                                                                                                                                    | Preview (Production usage allowed)                                                                                                                                                                                                                                                                                                                                                                               |
| Latency           | **Low**. Optimized for near-real-time performance.                                                                                                                                                                                     | Higher. More computation is required for its advanced capabilities.                                                                                                                                                                                                                                                                                                                                              |
| Cost              | Cost-effective for specialized tasks. $0.02/image to $0.12/image                                                                                                                                                                       | Token-based pricing. $30 per 1 million tokens for image output (image output tokenized at 1290 tokens per image flat, up to 1024x1024px)                                                                                                                                                                                                                                                                         |
| Recommended tasks | - Image quality, photorealism, artistic detail, or specific styles (e.g., impressionism, anime) are top priorities. - Infusing branding, style, or generating logos and product designs. - Generating advanced spelling or typography. | - Interleaved text and image generation to seamlessly blend text and images. - Combine creative elements from multiple images with a single prompt. - Make highly specific edits to images, modify individual elements with simple language commands, and iteratively work on an image. - Apply a specific design or texture from one image to another while preserving the original subject's form and details. |

Imagen 4 should be your go-to model when starting to generate images with Imagen. Choose Imagen 4 Ultra for advanced use-cases or when you need the best image quality (note that can only generate one image at a time).

## What's next

- Find more examples and code samples in the[cookbook guide](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_Started_Nano_Banana.ipynb).
- Check out the[Veo guide](https://ai.google.dev/gemini-api/docs/video)to learn how to generate videos with the Gemini API.
- To learn more about Gemini models, see[Gemini models](https://ai.google.dev/gemini-api/docs/models/gemini).



# Gemini API reference

<br />

This API reference describes the standard, streaming, and realtime APIs you can
use to interact with the Gemini models. You can use the REST APIs in any
environment that supports HTTP requests. Refer to the
[Quickstart guide](https://ai.google.dev/gemini-api/docs/quickstart) for how to
get started with your first API call. If you're looking for the references for
our language-specific libraries and SDKs, go to the link for that language in
the left navigation under **SDK references**.

## Primary endpoints

The Gemini API is organized around the following major endpoints:

- **Standard content generation ([`generateContent`](https://ai.google.dev/api/generate-content#method:-models.generatecontent)):** A standard REST endpoint that processes your request and returns the model's full response in a single package. This is best for non-interactive tasks where you can wait for the entire result.
- **Streaming content generation ([`streamGenerateContent`](https://ai.google.dev/api/generate-content#method:-models.streamGenerateContent)):** Uses Server-Sent Events (SSE) to push chunks of the response to you as they are generated. This provides a faster, more interactive experience for applications like chatbots.
- **Live API ([`BidiGenerateContent`](https://ai.google.dev/api/live#send-messages)):** A stateful WebSocket-based API for bi-directional streaming, designed for real-time conversational use cases.
- **Batch mode ([`batchGenerateContent`](https://ai.google.dev/api/batch-mode)):** A standard REST endpoint for submitting batches of `generateContent` requests.
- **Embeddings ([`embedContent`](https://ai.google.dev/api/embeddings)):** A standard REST endpoint that generates a text embedding vector from the input `Content`.
- **Gen Media APIs:** Endpoints for generating media with our specialized models such as [Imagen for image generation](https://ai.google.dev/api/models#method:-models.predict), and [Veo for video generation](https://ai.google.dev/api/models#method:-models.predictlongrunning). Gemini also has these capabilities built in which you can access using the `generateContent` API.
- **Platform APIs:** Utility endpoints that support core capabilities such as [uploading files](https://ai.google.dev/api/files), and [counting tokens](https://ai.google.dev/api/tokens).

## Authentication

All requests to the Gemini API must include an `x-goog-api-key` header with your
API key. Create one with a few clicks in [Google AI
Studio](https://aistudio.google.com/app/apikey).

The following is an example request with the API key included in the header:  

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "Explain how AI works in a few words"
              }
            ]
          }
        ]
      }'

For instructions on how to pass your key to the API using Gemini SDKs,
see the [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key) guide.

## Content generation

This is the central endpoint for sending prompts to the model. There are two
endpoints for generating content, the key difference is how you receive the
response:

- **[`generateContent`](https://ai.google.dev/api/generate-content#method:-models.generatecontent)
  (REST)**: Receives a request and provides a single response after the model has finished its entire generation.
- **[`streamGenerateContent`](https://ai.google.dev/api/generate-content#method:-models.streamgeneratecontent)
  (SSE)**: Receives the exact same request, but the model streams back chunks of the response as they are generated. This provides a better user experience for interactive applications as it lets you display partial results immediately.

### Request body structure

The [request body](https://ai.google.dev/api/generate-content#request-body) is a JSON object that is
**identical** for both standard and streaming modes and is built from a few core
objects:

- [`Content`](https://ai.google.dev/api/caching#Content) object: Represents a single turn in a conversation.
- [`Part`](https://ai.google.dev/api/caching#Part) object: A piece of data within a `Content` turn (like text or an image).
- `inline_data` ([`Blob`](https://ai.google.dev/api/caching#Blob)): A container for raw media bytes and their MIME type.

At the highest level, the request body contains a `contents` object, which is a
list of `Content` objects, each representing turns in conversation. In most
cases, for basic text generation, you will have a single `Content` object, but
if you'd like to maintain conversation history, you can use multiple `Content`
objects.

The following shows a typical `generateContent` request body:  

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
              "role": "user",
              "parts": [
                  // A list of Part objects goes here
              ]
          },
          {
              "role": "model",
              "parts": [
                  // A list of Part objects goes here
              ]
          }
        ]
      }'

### Response body structure

The [response body](https://ai.google.dev/api/generate-content#response-body) is similar for both
the streaming and standard modes except for the following:

- Standard mode: The response body contains an instance of [`GenerateContentResponse`](https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse).
- Streaming mode: The response body contains a stream of [`GenerateContentResponse`](https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse) instances.

At a high level, the response body contains a `candidates` object, which is a
list of `Candidate` objects. The `Candidate` object contains a `Content`
object that has the generated response returned from the model.

## Request examples

The following examples show how these components come together for different
types of requests.

### Text-only prompt

A simple text prompt consists of a `contents` array with a single `Content`
object. That object's `parts` array, in turn, contains a single `Part` object
with a `text` field.  

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "Explain how AI works in a single paragraph."
              }
            ]
          }
        ]
      }'

### Multimodal prompt (text and image)

To provide both text and an image in a prompt, the `parts` array should contain
two `Part` objects: one for the text, and one for the image `inline_data`.  

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
        "contents": [{
        "parts":[
            {
                "inline_data": {
                "mime_type":"image/jpeg",
                "data": "/9j/4AAQSkZJRgABAQ... (base64-encoded image)"
                }
            },
            {"text": "What is in this picture?"},
          ]
        }]
      }'

### Multi-turn conversations (chat)

To build a conversation with multiple turns, you define the `contents` array
with multiple `Content` objects. The API will use this entire history as context
for the next response. The `role` for each `Content` object should alternate
between `user` and `model`.
**Note:** The client SDKs provide a chat interface that manages this list for you automatically. When using the REST API, you are responsible for maintaining the conversation history.  

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "role": "user",
            "parts": [
              { "text": "Hello." }
            ]
          },
          {
            "role": "model",
            "parts": [
              { "text": "Hello! How can I help you today?" }
            ]
          },
          {
            "role": "user",
            "parts": [
              { "text": "Please write a four-line poem about the ocean." }
            ]
          }
        ]
      }'

### Key takeaways

- `Content` is the envelope: It's the top-level container for a message turn, whether it's from the user or the model.
- `Part` enables multimodality: Use multiple `Part` objects within a single `Content` object to combine different types of data (text, image, video URI, etc.).
- Choose your data method:
  - For small, directly embedded media (like most images), use a `Part` with `inline_data`.
  - For larger files or files you want to reuse across requests, use the File API to upload the file and reference it with a `file_data` part.
- Manage conversation history: For chat applications using the REST API, build the `contents` array by appending `Content` objects for each turn, alternating between `"user"` and `"model"` roles. If you're using an SDK, refer to the SDK documentation for the recommended way to manage conversation history.

## Response examples

The following examples show how these components come together for different
types of requests.

### Text-only response

A simple text response consists of a `candidates` array with one or more
`content` objects that contain the model's response.

The following is an example of a **standard** response:  

    {
      "candidates": [
        {
          "content": {
            "parts": [
              {
                "text": "At its core, Artificial Intelligence works by learning from vast amounts of data ..."
              }
            ],
            "role": "model"
          },
          "finishReason": "STOP",
          "index": 1
        }
      ],
    }

The following is series of **streaming** responses. Each response contains a
`responseId` that ties the full response together:  

    {
      "candidates": [
        {
          "content": {
            "parts": [
              {
                "text": "The image displays"
              }
            ],
            "role": "model"
          },
          "index": 0
        }
      ],
      "usageMetadata": {
        "promptTokenCount": ...
      },
      "modelVersion": "gemini-2.5-flash-lite",
      "responseId": "mAitaLmkHPPlz7IPvtfUqQ4"
    }

    ...

    {
      "candidates": [
        {
          "content": {
            "parts": [
              {
                "text": " the following materials:\n\n*   **Wood:** The accordion and the violin are primarily"
              }
            ],
            "role": "model"
          },
          "index": 0
        }
      ],
      "usageMetadata": {
        "promptTokenCount": ...
      }
      "modelVersion": "gemini-2.5-flash-lite",
      "responseId": "mAitaLmkHPPlz7IPvtfUqQ4"
    }

## Live API (BidiGenerateContent) WebSockets API

Live API offers a stateful WebSocket based API for bi-directional streaming to
enable real-time streaming use cases. You can review
[Live API guide](https://ai.google.dev/gemini-api/docs/live) and the [Live API reference](https://ai.google.dev/api/live)
for more details.

## Specialized models

In addition to the Gemini family of models, Gemini API offers endpoints for
specialized models such as [Imagen](https://ai.google.dev/gemini-api/docs/imagen),
[Lyria](https://ai.google.dev/gemini-api/docs/music-generation) and
[embedding](https://ai.google.dev/gemini-api/docs/embeddings) models. You can check out
these guides under the Models section.

## Platform APIs

The rest of the endpoints enable additional capabilities to use with the main
endpoints described so far. Check out topics
[Batch mode](https://ai.google.dev/gemini-api/docs/batch-mode) and
[File API](https://ai.google.dev/gemini-api/docs/files) in the Guides section to learn more.

## What's next

If you're just getting started, check out the following guides, which will help
you understand the Gemini API programming model:

- [Gemini API quickstart](https://ai.google.dev/gemini-api/docs/quickstart)
- [Gemini model guide](https://ai.google.dev/gemini-api/docs/models/gemini)

You might also want to check out the capabilities guides, which introduce different
Gemini API features and provide code examples:

- [Text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Context caching](https://ai.google.dev/gemini-api/docs/caching)
- [Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)