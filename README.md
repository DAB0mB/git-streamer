# Git Streamer

With Git Streamer you can start a video call, and share your screen / git project simultaneously. Every change that you make in your project, will be reflected live in the hosted text editor.

<img align="center" alt="git-vide" src="https://user-images.githubusercontent.com/7648874/106060751-1f1e3d80-60fd-11eb-8a23-c418928ee157.png">
<img align="center" alt="git-code" src="https://user-images.githubusercontent.com/7648874/106059610-a36fc100-60fb-11eb-819e-e269b4b76aa7.png">

To further understand how Git Streamer works I recommend you to read: [An architectural overview for Web RTC: A protocol for implementing video conferencing](https://medium.com/@eytanmanor/an-architectural-overview-for-web-rtc-a-protocol-for-implementing-video-conferencing-e2a914628d0e).

## Getting Started

To get started, install `gits` CLI:

    $ npm install -g @git-streamer/cli

And create a new session:

    $ gits --copy --open --salt 100

- **`--copy`** - copy the session URL to the clipboard so you can start sharing immediately.
- **`--open`** - open the session URL in the browser.
- **`--salt 100`** - create an extra secure session with a very long ID.

You can also use the **`--allow-write`** option, which will give the participants the ability to edit your local files directly from the web editor.

The CLI will update itself automatically with each run. You can use the **`--no-update`** option to disable that behavior, although not recommended.

Alternatively, you can use the **`--force-update`** option, if for any reason, you would like to address the NPM registry regardless of your installed version.

For help, use the **`--help`** option.

## Security

Git Streamer requires read/write access to project files. It will be watching over changes in your `.git` and project directories, and it will be streaming these changes to whoever is listening on the other side.

If specified, the participants of the call will have the ability to edit files directly from the hosted text editor; Git Streamer will be listening to these changes and will be merging them to your project. If the changes were forced outside of the scope of your project, they will be ignored.

Git Streamer uses proxy servers as means to stream some changes (turn/stun, signaling server) and will not store any of your data unless explicitly given permission to do so.

## Terms of Service

**Use at your own risk!**. Git Streamer will give read/write access to people who are attending your call. Despite my efforts to make Git Streamer safe to use, you should bare in mind that it's in an early stage of development. I will take no responsibility in case of leak of information, hijack, Trojan, or any kind of malicious injection.

## LICENSE

Copyright (C) 2021 by Eytan Manor (DAB0mB)

You're free to modify, merge, publish and distribute your own copy of the software without any restrictions or limitations. You're NOT allowed to sublicense, and/or sell copies of the software while using Git Streamer hosted APIs, SaaS platforms, streaming services, and alike. Otherwise, permission is hereby granted, free of charge, to sublicense, and/or sell your own copy of the software.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
