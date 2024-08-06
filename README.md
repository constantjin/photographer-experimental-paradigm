# Photographer Experimental Paradigm
A novel naturalisitc real-world reinforement learning (RL) paradigm in Google street-view environments. 

## Experimental paradigm
![Photographer Experimental Paradigm](images/experimental_paradigm.png)

> [Example video](https://youtu.be/Q4SWYZAgP8o) of a single trial

## Hardwares
- `Presentation PC`: Windows 10/11 x64 (tested)
- `Joystick/Gamepad`: [Tethyx MR-compatible fMRI joystick](https://www.curdes.com/mainforp/responsedevices/hhsc-joy-5.html) (_Current Designs_, used in our experiment)
    - Note that any general Xbox gamepad (_Microsoft_) can be used for non-fMRI tasks
- `fMRI opto-electronic Interface`: [932 fORP Interface](https://www.curdes.com/fiu-932b.html) (_Current Designs_, used in our experiment)

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
    - Or you can directly download the source code ZIP file at the GitHub page (`<> Code` icon > `Download ZIP` menu) and decompress.
3. Install dependencies: 
    ```bash 
    npm install
    ```
4. Build the binary:
    ```bash
    npm run build
    ```
5. Move to `release/0.0.1/win-unpacked` direcotry and run `Photographer Experimental Paradigm.exe`.

### Preparation before the experiment
- Prepare the `experimental_settings.json` file
    - Before the participant registration, the paradigm requires to load experimental settings and CLIP models from a json file.
    - Therefore, rename `experimental_setting.json.example` in the project root as `experimental_setting.json` and modify experimental parameters by following the Experimental Setting section below.

- Setup up the joystick/fMRI fORP interface and test them
    - For fMRI experiments, the MR-compatible joystick should be connected the presentation computer through fMRI interface. Please refer to the fMRI interface documentation ([example](https://wiki.curdes.com/bin/view/CdiDocs/932QuickSetup)) to correctly configure and calibrate the joystick.
    - For non-fMRI experiments, the presentation PC would automatically recognize the gamepad (i.e., Xbox controller) plug-and-play.
    - Regardless of fMRI or non-fMRI experiments, please test the connected joystick with [Gamepad Tester](https://hardwaretester.com/gamepad) site. 
        - For the Tethyx joystick, the values at the Axis0/1 panels should change if you move the analogue stick, and the B0 value should be 1 if you press the thumb button. 
        - For the Xbox controller, the Axis0/1 should correspond to the left analogue stick, and the B0 should respond to the A button.

- Setup the fMRI sync input
    - In our neuroimaging center, the Syncbox (_NordicNeuroLab_) is configured to send `s` key input to the presentation PC if it receives signals from the MRI. Therefore, the sync page of this paradigm will respond to `s` key input to start the task run.
    - Therefore, please test the sync signal and check whether it sends `s` key input (e.g., using a text editor like Notepad) before the experiment.
    - If your Syncbox sends signals other than `s`, please update the keycode in `src/routes/Sync.tsx` (line 17, `event.code === "KeyS"`) and re-build the binary ([Build on your local computer](#build-on-your-local-computer-windows-1011-x64) section).
    - For non-fMRI experiments, just press `s` key at the sync page to start the task run.