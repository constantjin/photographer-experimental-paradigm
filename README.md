# Photographer Experimental Paradigm
A novel, naturalistic, real-world reinforcement learning (RL) paradigm in Google Street View environments.

## References

  - **Jin, S.**, Lee, J., & Lee, J. H. Historical Feedback Representations Robustly Guide Learning. Organization for Human Brain Mapping (OHBM) 2024. Seoul, Korea.
  - **Jin, S.**, Lee, J., & Lee, J. H. How to Be a Good Photographer: Multi-modal Learning In a Real-life Environment. OHBM 2023. Montreal, Canada. **[Oral Presentation]**

## Experimental paradigm
![Photographer Experimental Paradigm](images/experimental_paradigm.png)

> [Example video](https://youtu.be/Q4SWYZAgP8o) of a single trial

## Hardwares
- `Presentation PC`: Windows 10/11 x64 (tested)
- `Joystick/Gamepad`: [Tethyx MR-compatible fMRI joystick](https://www.curdes.com/mainforp/responsedevices/hhsc-joy-5.html) (_Current Designs_, used in our experiment)
    - Note that any general Xbox gamepad (_Microsoft_) can be used for non-fMRI tasks
- `fMRI Opto-electronic Interface`: [932 fORP Interface](https://www.curdes.com/fiu-932b.html) (_Current Designs_, used in our experiment)

## Usage
### Download the prebuilt binary
- [[Google Drive](https://drive.google.com/file/d/1k7KaDfDEnlaQNDnCpTePQaYa9NgGAnLz/view?usp=sharing)] Windows 10/11 x64 (64-bits)
- [[GitHub Release](https://github.com/constantjin/photographer-experimental-paradigm/releases/download/0.0.1/Photographer.Experimental.Paradigm-0.0.1-win.zip)] Windows 10/11 x64 (64-bits)
- Decompress the ZIP file (`Photographer Experimental Paradigm-0.0.1-win.zip`) and run `Photographer Experimental Paradigm.exe`.

### Build on your local computer (Windows 10/11 x64)
1. Install [Node.js](https://nodejs.org/en) >= 16.0.0 (currently tested on Node 20.11.0).
2. Install [git](https://git-scm.com/) and clone this repository:

    ```bash
    git clone https://github.com/constantjin/photographer-experimental-paradigm.git
    ```
    - Or you can directly download the source code ZIP file from the GitHub page (`<> Code` icon > `Download ZIP` menu) and decompress it.
3. Install dependencies: 
    ```bash 
    npm install
    ```
4. Build the binary:
    ```bash
    npm run build
    ```
5. Move to `release/0.0.1/win-unpacked` directory and run `Photographer Experimental Paradigm.exe`.

### Preparation before the experiment
- Prepare the `experimental_settings.json` file
    - Before the participant registration, the paradigm requires us to load experimental settings and CLIP models from a JSON file.
    - Therefore, rename the `experimental_setting.json.example` in the project root as `experimental_setting.json` and modify experimental parameters by following the [Experimental settings](#experimental-settings) section below.

- Setup up the joystick/fMRI fORP interface and test them
    - For fMRI experiments, the MR-compatible joystick should be connected to the presentation computer through the fMRI interface. Please refer to the fMRI interface documentation ([example](https://wiki.curdes.com/bin/view/CdiDocs/932QuickSetup)) to configure and calibrate the joystick correctly.
    - For non-fMRI experiments, the presentation PC would automatically recognize the gamepad (i.e., Xbox controller) plug-and-play.
    - Regardless of fMRI or non-fMRI experiments, please test the connected joystick with the [Gamepad Tester](https://hardwaretester.com/gamepad) site. 
        - For the Tethyx joystick, the values at the Axis0/1 panels should change if you move the analog stick, and the B0 value should be 1 if you press the thumb button. 
        - For the Xbox controller, the Axis0/1 should correspond to the left analog stick, and the B0 should respond to the A button.

- Setup the fMRI sync input
    - In our neuroimaging center, Syncbox (_NordicNeuroLab_) is configured to send a `s` key inputs to the presentation PC if it receives signals from the MRI. Therefore, the sync page of this paradigm will respond to `s` key input to start the task run.
    - Therefore, please test the sync signal and check whether it sends `s` key input (e.g., using a text editor like Notepad) before the experiment.
    - If your Syncbox sends signals other than `s`, please update the keycode in `src/routes/Sync.tsx` (line 17, `event.code === "KeyS"`) and re-build the binary ([Build on your local computer](#build-on-your-local-computer-windows-1011-x64) section).
    - For non-fMRI experiments, just press the `s` key at the sync page to start the task run.

- Change the screen resolution to `800 x 600` px
    - The field-of-view of the street view and font sizes were pre-selected for the 800 x 600 px screen resolution.
    - Although it is not necessary, we recommend you change the screen resolution to `800 x 600` px (especially for the fMRI experiment).

### Participant registration
- After executing `Photographer Experimental Paradigm.exe`, you will see the registration page. Click `⚙️ Setting` > `Load Settings` and select your `experimental_setting.json` file. The paradigm would load the settings and CLIP models.

    - If you see `JSON parse error`(s), then the JSON file is misconfigured. Press `Ctrl` + `Shfit` + `i` (Windows) to open the DevTools, select the `Console` panel and check misconfigured keys in the JSON file.
    - If CLIP models are not loaded, you will see the `❌ Unloaded` message in the `📎 CLIP` section. The `clipTextModelPath` or `clipImageModelPath` is likely misconfigured. Open the `Console` panel in DevTools and check the model paths.

- You can check the joystick/gamepad connection status at the `🕹️ Controller` panel. Move the joystick. The `❌ Disconnected` message will change to `✔️ Connected` if the joystick is correctly configured.

- If the setting file and CLIP models are loaded, you can register a participant by filling in the Name/ID and clicking the `Register / Load the Participant ` button. If this is the first run, the paradigm will create a participant data directory in the path specified in the `experimentalDataStore` key. If the data directory has been created before (i.e., not the first run), it will automatically compute the next run number and start that run.

- After successful registration, you can start the experiment by pressing the `Start Experiment` button. Enter the full screen at the sync page by pressing `F11`.

### Control
- You can change your viewpoints (or 'rotate') by moving the joystick (or left analog stick) to the `left` and `right` direction.

- There are 'arrows' pointing to new locations in the street view. Move the joystick `up`, then you will move to the new location following the arrow closest to your heading direction. If you move the joystick `down`, you will move to the previous location.

- You can capture the current scene by pressing the `thumb button` (or `A` button in gamepads). Note that the paradigm automatically captures the scene after `trialInfo.captureIntervalInMs` (default: 40000 ms or 40 s).

## Experimental settings
Guides and explanations for keys in `experimental_setting.json.example` file. Note that **all keys are required** for the paradigm.

| Key | Type | Details | Default
| --- | ---- | ------- | -------
| googleMapsAPIKey | `string` | API key for Google Maps JavaScript API. You can issue a new API key following [this guide](https://developers.google.com/maps/documentation/javascript/get-api-key). | |
| azureAPIUrl | `string` | Azure AI Vision, Analyze API endpoint URL. For example, `https://[your-project-name].cognitiveservices.azure.com/vision/v3.1/analyze?visualFeatures=Description`. You can get your endpoint URL and key after [creating a Vision resource](https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision) in Azure Portal. | |
| azureAPIKey | `string` | Azure AI Vision, Analyze API endpoint key. | |
| googleTTSAPIKey | `string` | API key for Google Text-To-Speech (TTS) API. You can set up a TTS project following [this guide](https://cloud.google.com/text-to-speech/docs/before-you-begin) and get an API key at the Google Cloud Console. | |
| clipTextModelPath | `string` | Path for the CLIP Text encoder model. You can download the model from this [HuggingFace 🤗 repo](https://huggingface.co/rocca/openai-clip-js/tree/main). We used `clip-text-vit-32-float32-int32.onnx`. We recommend using abstract paths for the settings. | |
| clipImageModelPath | `string` | Path for the CLIP Image encoder model. We used `clip-image-vit-32-float32.onnx`. | |
| experimentalDataStorePath | `string` | Path for the experimental data. All participant directories/data would be created and stored in this path. | |
| runInfo | `RunInfo[]` | Array containing the city information and target caption text used in the experiments. Participants will visit each city in each run (in a pseudo-random order). Therefore, the length of the `runInfo` array equals the total number of runs. See below for each key in a `RunInfo` object. | |
| runInfo.city | `string` | Name of a city. We used "Boston", "New York", "Los Angeles", "London", and "Paris". | |
| runInfo.latlng | `{ lat: number; lng: number }` | Latitude and longitude of the initial starting point. We used the coordinates of the City Hall for each city. | |
| runInfo.captionText | `string` | Target context (caption) for the city. We used the same sentence ("A person on the bicycle is waiting for the traffic light.") for all cities/runs. ||
| trialInfo | `TrialInfo` | Constants for all trial events (i.e., Exploration, Preview, Cross-modal, Feedback, and Cross-fixation). See below for details. | |
| trialInfo.totalNumberOfTrials | `number` | Total number of trials (or 'capture attempts') in a run. We used 8 trials. | 8 |
| trialInfo.captureIntervalInMs | `number` | Maximum exploration time in milliseconds for the Exploration phase. After that, the paradigm automatically captures (annotated as 'capture_failed') the scene and moves to the next event. We set 40 s (40000 ms) for the exploration time. | 40000 |
| trialInfo.fixationDurationInMs | `number` | Base duration for cross-fixations between events. We used 5 s (5000 ms). | 5000 |
| trialInfo.fixationJitterRatio | `number` | Percentage of random jittering for cross-fixation durations. Each cross-fixation is shown for a (pseudo) random duration between `(1 - fixationJitterRatio) * fixationDurationInMs` and `(1 + fixationJitterRatio) * fixationDurationInMs`. We used 20% jittering. | 0.2 |
| trialInfo.capturePreviewDurationInMs | `number` | Duration for the Preview block. Default 2 s (2000 ms). | 2000 |
| trialInfo.multimodalDurationInMs | `number` | Duration for the Cross-Modal (Multimodal) event block. The default is 3 s (3000 ms). | 3000 |
| trialInfo.propabilityOfCaptionText| `number` | Probability of presenting a caption text (generated using Azure Vision API) than a TTS voice in the Cross-Modal block (default: 50%). | 0.5 |
| trialInfo.speakingRate | `number` | Speaking speed of TTS voices generated using Google TTS API. Larger values lead to faster speaking. We used 1.2 (20% faster than default).  | 1.2 |
| trialInfo.rewardDurationInMs | `number` | Duration of the Feedback (Reward) block. Default 2 s (2000 ms). | 2000 |
| trialInfo.minSimilarityThreshold | `number` | Minimal cosine similarity score used in feedback score computation. All cosine similarity scores less than this (default: 0.18) are presented as 0 feedback scores. | 0.18 |
| trialInfo.maxSimilarityThreshold | `number` | Maximum cosine similarity score for feedback score computation (default: 0.28). Presented feedback scores are normalized as `(cosineSimilarityScore - minSimilarityThreshold) / (maxSimilarityThreshold - minSimilarityThreshold) * 100`. | 0.28 |

## Stored data
You can find participant data directories in the path specified as `experimentalDataStorePath` in `experimental_setting.json`. Details for each directory or file are below:

| Directory | File | Details |
| --------- | ---- | ------- |
| (root) | `runinfo.txt` | Information about run numbers and city names for task runs. Each run information is stored as `[run number]_[city_name]#[index for runInfo array]` in a row. |
| `[run_number]_[city_name]` | `log_etime.txt` | An etime ('event time') file for a run. Each row has `[YYYY-MM-DD HH:mm:ss.SSS]\t[event_name]` form. For 'feedback' event rows, `trial_reward:` represents a raw cosine similarity score, and `percent:` represents a normalized feedback score. |
| | `controller_action.txt` | Joystick/gamepad log for a run. Controller events are stored as `{ "action": string; "coordinate": string; "fov": { "heading": number; "pitch": number; "zoom": number } }`. Note that only distinct controller actions are logged (i.e., continuous actions except for initiation are ignored). |
| `capture` | `trial_[trial_number].jpg` | Captured photograph for each trial. |
| `caption_audio` | `trial_[trial_number].mp3` | TTS-converted voice file for a caption sentence of each trial. Note that the actual caption sentences are stored in the `log_etime.txt`. |
| `feature_vector` | `text_feature.json` | CLIP-Text encoder feature vector of the target caption text specified in `trialInfo.captionText`. |
| | `image_feature_trial_[trial_number].json` | CLIP-Image encoder feature vector for each captured photograph. They have the same dimension as the `text_feature.json`. |

## Acknowledgments
- [electron-vite/electron-vite-react](https://github.com/electron-vite/electron-vite-react): Template for this repository (Original [README.md](acknowledgements/electron-vite-react/README.md)).
- [ChristopherHButler/awesome-react-gamepad](https://github.com/ChristopherHButler/awesome-react-gamepads): Originally we included the package in our dependency lists. However, it depends on the incompatible React version to our codes, which resulted in peer dependency errors during `npm install`. Therefore, we had to copy their codes from their repositories and remove this package from our dependency lists. 
- [josephrocca/openai-clip-js](https://github.com/josephrocca/openai-clip-js): Their works made is possible to use CLIP encoders in an electron environment. 