// 检测运行环境
        const isElectron = typeof require !== 'undefined' && typeof process !== 'undefined';
        
        // 显示环境提示
        if (!isElectron) {
            console.warn('⚠️ 警告：此应用需要在Electron环境中运行！');
            console.warn('请使用 npm start 命令启动，不要直接在浏览器中打开HTML文件');
            
            // 显示警告提示
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#ff4444;color:white;padding:15px 30px;border-radius:8px;z-index:99999;font-size:16px;';
            warningDiv.innerHTML = '⚠️ 请通过Electron运行此应用！使用 <strong>npm start</strong> 命令';
            document.body.appendChild(warningDiv);
            
            setTimeout(() => {
                warningDiv.style.display = 'none';
            }, 10000);
        }
        
        console.log('✅ 应用加载中... 运行环境:', isElectron ? 'Electron' : '浏览器');
        
        const memeImages = [
            '01e89652da2e85dc503a3761fb6ac7653546769371695776.png@1052w_!web-dynamic.webp',
            '041cd265303589d6d0d571afdfce1fd83546769371695776.png@1052w_!web-dynamic.webp',
            '042b509ff14b2bdcd24a97eec7cf04c73546769371695776.png@1052w_!web-dynamic.avif',
            '19198f988ae9a801f99117de4122f1ff3546769371695776.png@1052w_!web-dynamic.webp',
            '19fda978049b40fc21fde5c85ce2f36f3546769371695776.png@1052w_!web-dynamic.avif',
            '1a10abe7a909836b368a1cf81a69ec113546769371695776.png@1052w_!web-dynamic.webp',
            '1f0c2fa74d3dd0b3e5d7077ceaff074b3546769371695776.png@264w_264h_1e_1c.webp',
            '23f1bc4b64b0bba139db47dc36a67ebb3546769371695776.png@1052w_!web-dynamic.avif',
            '2951d9aa1ba5ab328c4f2578fa879e883546769371695776.png@1052w_!web-dynamic.webp',
            '2b51514bfa40169b32ea651ec5e438fa3546769371695776.png@1052w_!web-dynamic.avif',
            '33d1de9ce77167efb67745cbd5ed7f353546769371695776.jpg@560w_560h_1e_1c.webp',
            '3402f5f1e2aa5e6014063c511c33e0113546769371695776.png@1052w_!web-dynamic.avif',
            '345f13031e3a16f6e4b93e7b2f7b4f603546769371695776.png@264w_264h_1e_1c.webp',
            '3536666fd54869340b6cb10ff50770743546769371695776.png',
            '35914d0ce9649ceda6ce60afda46a7193546769371695776.png@1052w_!web-dynamic.webp',
            '37c8c3f8282adbfa7200606e8dad9b9f3546769371695776.png@1052w_!web-dynamic.webp',
            '384503c8334ed269919523b9df8e6e533546769371695776.png@1052w_!web-dynamic.avif',
            '3859e9ee23bb166c0c38440942148a633546769371695776.png',
            '38a6c1e961b9ae27bed221b5fed4afc13546769371695776.gif',
            '426f43344c576d063721551894216d203546769371695776.png@1052w_!web-dynamic.webp',
            '441330913b1746ec3118f241c083fc883546769371695776.png',
            '4477c8b1141cd2cd9aef2102fca5bbfa3546769371695776.png@264w_264h_1e_1c.webp',
            '4defca7da871d965862ed6ac51a57cf23546769371695776.png@1052w_!web-dynamic.avif',
            '4f1df7b10fa77f80df98063e5be496ac3546769371695776.jpg@714w_536h_1c_1s.webp',
            '5053bc3e6cb6afe9b0099d368f8849783546769371695776.png@1052w_!web-dynamic.webp',
            '56468a8cafbb35d71cd99a75d754718a3546769371695776.jpg@402w_536h_1c_1s.webp',
            '6431901e4a9559a054c917d721b6706b3546769371695776.png',
            '68792ebe836b3c3bdf3d97596e3329463546769371695776.png',
            '6ea3884bc98a4114d25cd65f7037f0bf3546769371695776.png@1052w_!web-dynamic.avif',
            '6ea41b3772f26bfad4bc8b3afa6874363546769371695776.png@1052w_!web-dynamic.webp',
            '70c57017fc08776e0640dc6eff7563413546769371695776.png@1052w_!web-dynamic.avif',
            '78ae61efa2e6bd5e0e8f4e6008b784e73546769371695776.png@1052w_!web-dynamic.webp',
            '7ab98e494501f091012eaca16db997223546769371695776.png@1052w_!web-dynamic.webp',
            '82fbed2937436d7732e838d8a749fd413546769371695776.jpg@1052w_!web-dynamic.webp',
            '839bd51145cf013340d428455e3c0cb63546769371695776.jpg@1052w_!web-dynamic.avif',
            '876b67ab8d5092201c62edf6ffca33163546769371695776.png@1052w_!web-dynamic.avif',
            '87b6acd88f7c198ce6c8f8df2b67a22f3546769371695776.jpg@1052w_!web-dynamic.webp',
            '8ca3620e3f9232088bc629b683b87e183546769371695776.png@1052w_!web-dynamic.avif',
            '932d7b43ea10a7ee29c48daaf620fab73546769371695776.png@1052w_!web-dynamic.webp',
            '967fe48d2d27e55b926c86c69a64ce333546769371695776.png@1052w_!web-dynamic.avif',
            '9a973203685b88b0a759f6d3f33464ce3546769371695776.png@1052w_!web-dynamic.webp',
            '9eef3bef04114e5a4931d1d584bc49fc3546769371695776.jpg@714w_536h_1c_1s.webp',
            '9f8c546514f61756e3d58a77c80e775b3546769371695776.png@1052w_!web-dynamic.avif',
            'a52cf2ce87ebe6fcc01f29b15ec7943b3546769371695776.png@1052w_!web-dynamic.avif',
            'a7d0f21a37fe7e251cbf749426b8ee243546769371695776.png@264w_264h_1e_1c.webp',
            'b03c818e5021ce3b8b584693711752323546769371695776.jpg@1052w_!web-dynamic.webp',
            'b0d2a06eb91695b0ae0686643cb637b93546769371695776.png@1052w_!web-dynamic.webp',
            'b32bda2b798a3c291087a87d3bee19c23546769371695776.png@1052w_!web-dynamic.webp',
            'b47b3df9a817350f26270a274110e73a3546769371695776.png@1052w_!web-dynamic.avif',
            'b5609913f08fc37e8d08d77a6ab3db623546769371695776.png@1052w_!web-dynamic.avif',
            'bfeffbf36146fc5d70a314f8738f5a753546769371695776.png@1052w_!web-dynamic.avif',
            'c849f82f4069a7038ce18060a12855533546769371695776.jpg@1052w_!web-dynamic.webp',
            'ccecc1c93fd928cb21135114136ff50f3546769371695776.jpg@714w_536h_1c_1s.webp',
            'cfc8986fafcd64d2d1210545355ef4da3546769371695776.png@1052w_!web-dynamic.avif',
            'db3017875ff08e135603f1519aded14f3546769371695776.gif@1052w_!web-dynamic.webp',
            'e93f9477215aaabe492a4b006b732acf3546769371695776.png@1052w_!web-dynamic.webp',
            'f086aabc0140fbfe4bf4785971a401ea3546769371695776.png@1052w_!web-dynamic.avif',
            'f1f573dcd5cea263421b180b03e8d7743546769371695776.jpg@536w_536h_1c_1s.webp',
            'f5a51f492b7ac651468ad5a2a75ea4643546769371695776.png@1052w_!web-dynamic.avif',
            'f5e54f51168ef7ac4d3cb2077b7934e53546769371695776.jpg@1052w_!web-dynamic.webp',
            'fd5c33d14d2f949d8613f04c3dabb4003546769371695776.png@1052w_!web-dynamic.webp'
        ];

        const WORK_TIME = 25 * 60;
        const REST_TIME = 10 * 60;

        let currentTime = WORK_TIME;
        let isWorking = true;
        let timer = null;
        let currentPriority = 1;
        let isTimerPaused = false;

        // 全局搜索关键词（M14-5）。放在这里声明是为了避免在 render() 之前进入 TDZ
        let searchKeyword = '';

        /** 纯文本匹配：任务正文 + 评论 + 项目名一起搜，忽略 HTML 标签 */
        function matchKeyword(note, keyword) {
            if (!keyword) return true;
            let text = String(note.content || '').replace(/<[^>]*>/g, ' ');
            if (note.comments && note.comments.length) {
                text += ' ' + note.comments.map(c => (c && c.text) || '').join(' ');
            }
            if (note.project) text += ' ' + note.project;
            return text.toLowerCase().indexOf(keyword) !== -1;
        }

        const minEl = document.getElementById('min');
        const secEl = document.getElementById('sec');
        const modeText = document.getElementById('modeText');

        function updateTimeDisplay() {
            const m = String(Math.floor(currentTime / 60)).padStart(2, '0');
            const s = String(currentTime % 60).padStart(2, '0');
            minEl.innerText = m;
            secEl.innerText = s;

            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-time', {
                        time: `${m}:${s}`,
                        label: isWorking ? '工作时间' : '休息时间'
                    });
                } catch(e) {}
            }
        }

        function makeEditable(el, isMin) {
            el.onclick = () => {
                stopTimer();
                const currentVal = isMin ? Math.floor(currentTime / 60) : currentTime % 60;
                el.innerHTML = `<input type="number" class="time-input" id="timeInput_${isMin ? 'min' : 'sec'}" value="${currentVal}" min="0" max="${isMin ? 99 : 59}">`;
                const input = el.querySelector('input');
                input.focus();
                input.select();

                const finishEdit = () => {
                    let v = parseInt(input.value) || 0;
                    if (isMin) {
                        v = Math.max(0, Math.min(99, v));
                        currentTime = v * 60 + (currentTime % 60);
                    } else {
                        v = Math.max(0, Math.min(59, v));
                        currentTime = Math.floor(currentTime / 60) * 60 + v;
                    }
                    updateTimeDisplay();
                };

                input.onblur = finishEdit;
                input.onkeydown = e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishEdit();
                    }
                };
            };
        }
        makeEditable(minEl, true);
        makeEditable(secEl, false);

        let workEndSound = new Audio('仕事終わったよ.wav');
        let restEndSound = new Audio('休憩終わったよ.wav');
        workEndSound.volume = 1.0;
        restEndSound.volume = 1.0;

        function playEndSound() {
            stopTimer();
            if (isWorking) {
                workEndSound.currentTime = 0;
                workEndSound.play();
            } else {
                restEndSound.currentTime = 0;
                restEndSound.play();
            }
            const msg = isWorking ? "工作结束啦" : "休息结束啦";
            const tip = document.createElement('div');
            tip.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#ff3366;color:#fff;padding:30px 50px;border-radius:12px;font-size:24px;z-index:99999';
            tip.innerText = msg;
            document.body.appendChild(tip);
            setTimeout(() => tip.remove(), 3000);
        }

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function toggleTimer() {
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    // 只有在计时器未运行时才同步时间，运行时直接切换即可
                    if (document.getElementById('startBtn').innerText === '开始') {
                        ipcRenderer.send('set-timer-time', {
                            minutes: Math.floor(currentTime / 60),
                            seconds: currentTime % 60
                        });
                    }
                    ipcRenderer.send('toggle-timer');
                } catch(e) {}
            }
        }

        const dropZone = document.createElement('div');
        dropZone.id = 'dropZone';
        dropZone.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: #fff;
            font-size: 24px;
            border: 4px dashed #00a1d6;
        `;
        dropZone.textContent = '拖放 JSON 文件到此处导入笔记';
        document.body.appendChild(dropZone);

        const importDialog = document.createElement('div');
        importDialog.id = 'importDialog';
        importDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #222;
            border-radius: 12px;
            padding: 24px;
            z-index: 10001;
            display: none;
            flex-direction: column;
            gap: 16px;
            min-width: 320px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid #333;
        `;
        
        const dialogTitle = document.createElement('div');
        dialogTitle.textContent = '导入笔记';
        dialogTitle.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #fff;
            text-align: center;
        `;
        importDialog.appendChild(dialogTitle);

        const dialogButtons = document.createElement('div');
        dialogButtons.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;
        importDialog.appendChild(dialogButtons);

        const overwriteBtn = document.createElement('button');
        overwriteBtn.textContent = '覆盖';
        overwriteBtn.style.cssText = `
            padding: 10px 24px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        overwriteBtn.onmouseover = () => overwriteBtn.style.transform = 'scale(1.05)';
        overwriteBtn.onmouseout = () => overwriteBtn.style.transform = 'scale(1)';
        dialogButtons.appendChild(overwriteBtn);

        const mergeBtn = document.createElement('button');
        mergeBtn.textContent = '合并';
        mergeBtn.style.cssText = `
            padding: 10px 24px;
            background: linear-gradient(135deg, #4ecdc4, #44a3a0);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        mergeBtn.onmouseover = () => mergeBtn.style.transform = 'scale(1.05)';
        mergeBtn.onmouseout = () => mergeBtn.style.transform = 'scale(1)';
        dialogButtons.appendChild(mergeBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 10px 24px;
            background: rgba(100,100,100,0.3);
            border: 1px solid #444;
            border-radius: 8px;
            color: #aaa;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(100,100,100,0.5)';
        cancelBtn.onmouseout = () => cancelBtn.style.background = 'rgba(100,100,100,0.3)';
        dialogButtons.appendChild(cancelBtn);

        document.body.appendChild(importDialog);

        let pendingImportData = null; // 格式为 { notes: [], archivedNotes: [] }

        function showImportDialog(notesData, archivedData) {
            pendingImportData = {
                notes: notesData,
                archivedNotes: archivedData
            };
            importDialog.style.display = 'flex';
        }

        function hideImportDialog() {
            importDialog.style.display = 'none';
            pendingImportData = null;
        }

        overwriteBtn.onclick = () => {
            if (pendingImportData) {
                notes = pendingImportData.notes;
                archivedNotes = pendingImportData.archivedNotes;
                collectProjectNames();
                refreshProjectUI();
                save();
                saveArchive();
                alert('覆盖成功！');
            }
            hideImportDialog();
        };

        mergeBtn.onclick = () => {
            if (pendingImportData) {
                notes = notes.concat(pendingImportData.notes);
                archivedNotes = archivedNotes.concat(pendingImportData.archivedNotes);
                collectProjectNames();
                refreshProjectUI();
                save();
                saveArchive();
                alert('合并成功！');
            }
            hideImportDialog();
        };

        cancelBtn.onclick = hideImportDialog;

        window.onerror = function(message, source, lineno, colno, error) {
            alert("JS Error: " + message + " at line " + lineno + "\nSource: " + source);
            return false;
        };
        window.addEventListener('unhandledrejection', function(event) {
            alert("Unhandled Promise Rejection: " + event.reason);
        });

        // 先初始化视图和类型相关的状态变量
        let currentView = localStorage.getItem('currentView') || 'card';
        let currentTypeView = localStorage.getItem('currentTypeView') || 'all';
        let currentFilter = localStorage.getItem('currentFilter') || 'all';
        let dateFilterMode = 'week'; // 'week' or 'custom'
        
        function getThisWeekRange() {
            const now = new Date();
            const day = now.getDay(); // 0 is Sunday, 1-6 is Mon-Sat
            const diffToMonday = day === 0 ? -6 : 1 - day;
            
            const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
            monday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            
            return { start: monday.getTime(), end: sunday.getTime() };
        }

        function formatSimpleDate(timestamp) {
            const d = new Date(timestamp);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        let currentType = 'short'; // 默认短期

        let isDragOver = false;
        
        document.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDragOver) {
                isDragOver = true;
                dropZone.style.display = 'flex';
            }
        });

        document.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            const rect = dropZone.getBoundingClientRect();
            if (e.clientX <= rect.left || e.clientX >= rect.right || 
                e.clientY <= rect.top || e.clientY >= rect.bottom) {
                isDragOver = false;
                dropZone.style.display = 'none';
            }
        });

        document.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.display = 'none';
            isDragOver = false;
            
            const file = e.dataTransfer.files[0];
            if (!file || !file.name.endsWith('.json')) {
                alert('请拖放 JSON 文件');
                return;
            }
            
            const r = new FileReader();
            r.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    let importNotes = [];
                    let importArchived = [];
                    
                    if (Array.isArray(data)) {
                        importNotes = data;
                    } else if (data && typeof data === 'object') {
                        importNotes = data.notes || [];
                        importArchived = data.archived_notes || [];
                        // 项目登记表：合并导入（空项目也能保留下来）
                        if (Array.isArray(data.projects)) {
                            data.projects.forEach(p => {
                                const name = typeof p === 'string' ? p.trim() : '';
                                if (name && projects.indexOf(name) === -1) projects.push(name);
                            });
                            saveProjects();
                        }
                    } else {
                        alert('无效的笔记数据格式');
                        return;
                    }
                    
                    showImportDialog(importNotes, importArchived);
                } catch (err) {
                    alert('导入失败：' + err.message);
                }
            };
            r.readAsText(file);
        });

        // 记录已成功加载的图片 URL 缓存，避免列表重绘时重新渲染导致闪烁
        const loadedImageUrls = new Set();

        // 懒加载图片观察器（只针对大文件本地/网络磁盘图片起效，一旦加载即解绑，坚决不进行滚出卸载，彻底杜绝滚动闪烁）
        let lazyImageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const img = entry.target;
                if (entry.isIntersecting) {
                    if (img.dataset.src && img.src !== img.dataset.src) {
                        const realSrc = img.dataset.src;
                        img.src = realSrc;
                        loadedImageUrls.add(realSrc); // 记入已加载白名单
                        lazyImageObserver.unobserve(img); // 加载完成后立即解绑，保持状态绝对稳定
                    }
                }
            });
        }, {
            rootMargin: "400px 0px 400px 0px" // 适当增大 rootMargin 提前异步加载
        });

        function bindLazyImages() {
            document.querySelectorAll('.lazy-img:not([data-lazy-observed])').forEach(img => {
                img.setAttribute('data-lazy-observed', 'true');
                lazyImageObserver.observe(img);
            });
        }

        /** 1×1 透明 SVG 占位图：只用于「尚未进入视口的图片」，绝不能写回任务数据 */
        const LAZY_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==";
        // 【2026-11-06】只认真正的懒加载占位图。以前把所有 data:image/svg+xml 都当占位，
        // 结果粘贴进来的 SVG 矢量图会被当成"加载中的空图"直接丢掉。
        const isLazyPlaceholder = src => !!src && String(src) === LAZY_PLACEHOLDER;

        // 懒加载 HTML 中的图片
        function lazyloadifyHtml(htmlContent) {
            if (!htmlContent) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const imgs = tempDiv.getElementsByTagName('img');
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                // 【2026-10-20 修复图片重开就丢】取真实地址时优先 data-src：
                // 上一次渲染写入的占位图可能残留成 src，只读 img.src 会把占位图当成真实图片，
                // 随后 removeAttribute('data-src') 就把真正的图片路径删掉了。
                const currentAttrSrc = img.getAttribute('src') || '';
                const dataSrc = img.getAttribute('data-src') || '';
                const src = (!isLazyPlaceholder(dataSrc) && dataSrc) ? dataSrc : currentAttrSrc;

                // 统一为图片绑定微信风格大图浏览器拉起逻辑，点击即可放大，解决“照片点不了”的问题！
                img.setAttribute('onclick', `zoomImage(event, this.dataset.src || this.src)`);
                img.style.cursor = 'pointer';
                img.title = '点击放大图片';

                // 核心性能策略：如果图片本身就是内联 Base64 数据（直接存储在本地内存中），或者已经在已加载缓存中，
                // 则坚决不走懒加载流程，直接渲染输出真实图片，100% 避开 SVG 占位图的过渡，彻底解决闪烁与白屏！
                if (src && (src.startsWith('data:image/') || loadedImageUrls.has(src)) && !isLazyPlaceholder(src)) {
                    img.setAttribute('src', src);
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy-img');
                    continue;
                }

                if (src && !isLazyPlaceholder(src)) {
                    img.setAttribute('data-src', src);
                    img.setAttribute('src', LAZY_PLACEHOLDER);
                    img.classList.add('lazy-img');
                } else {
                    // 只剩占位图、没有真实地址：清掉占位，避免被当成一张图片保存 / 复制
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy-img');
                }
            }
            return tempDiv.innerHTML;
        }

        /**
         * 【2026-10-20 修复图片重开就丢】把 contenteditable 里的 DOM 转回任务数据。
         * 渲染时为了性能会把真实地址挪到 data-src、src 换成占位图；如果直接把 innerHTML
         * 存回去，真正的图片引用就丢了，下次打开只剩占位图，GC 还会把原图删掉。
         * 这里统一：优先 data-src → 写回 src；去掉懒加载痕迹与运行时绑定。
         */
        function serializeEditable(root) {
            if (!root) return '';
            const clone = root.cloneNode(true);
            clone.querySelectorAll('img').forEach(img => {
                const dataSrc = img.getAttribute('data-src');
                const src = img.getAttribute('src') || '';
                if (dataSrc && !isLazyPlaceholder(dataSrc)) {
                    img.setAttribute('src', dataSrc);
                } else if (isLazyPlaceholder(src)) {
                    // 既没有真实地址、又是占位图：这张图已经无法恢复，直接丢弃
                    img.remove();
                    return;
                }
                img.removeAttribute('data-src');
                img.removeAttribute('data-lazy-observed');
                img.classList.remove('lazy-img');
                img.removeAttribute('onclick');
                img.removeAttribute('title');
                img.style.cursor = '';
                if (!img.getAttribute('style')) img.removeAttribute('style');
            });
            return clone.innerHTML;
        }

        // 卡片分页加载状态
        let cardRenderLimit = 15;
        let tableRenderLimit = 30;
        let renderedCardCount = 0;
        let lastRenderedProjectGroup = null; // 按项目分组时，增量加载要接着上一个分组
        let archiveRenderLimits = {}; // 格式为 { '2026-06-29': 15 }
        let renderedArchiveCounts = {}; // 格式为 { '2026-06-29': 0 }

        // 列表滚动加载哨兵观察器
        let sentinelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sentinel = entry.target;
                    sentinelObserver.unobserve(sentinel); // 触发时立即停止观察，防止重绘死循环
                    
                    if (sentinel.id === 'notesListSentinel') {
                        cardRenderLimit += 15;
                        render(false);
                    } else if (sentinel.id === 'tableSentinel') {
                        tableRenderLimit += 30;
                        renderTable(false);
                    } else if (sentinel.id.startsWith('archive_sentinel_')) {
                        const dateStr = sentinel.dataset.date;
                        if (!archiveRenderLimits[dateStr]) archiveRenderLimits[dateStr] = 15;
                        archiveRenderLimits[dateStr] += 15;
                        renderArchiveGroupItems(dateStr, null, false);
                    }
                }
            });
        }, {
            rootMargin: "100px"
        });

        let sentinelTimeout = null;
        function bindSentinelObserver() {
            if (sentinelTimeout) clearTimeout(sentinelTimeout);
            sentinelTimeout = setTimeout(() => {
                const listSentinel = document.getElementById('notesListSentinel');
                if (listSentinel) sentinelObserver.observe(listSentinel);
                
                const tableSentinel = document.getElementById('tableSentinel');
                if (tableSentinel) sentinelObserver.observe(tableSentinel);
                
                document.querySelectorAll('.archive-sentinel').forEach(sentinel => {
                    sentinelObserver.observe(sentinel);
                });
            }, 100);
        }

        let notes = JSON.parse(localStorage.getItem('notes')) || [];
        let archivedNotes = JSON.parse(localStorage.getItem('archived_notes')) || [];

        // ==================== 项目分类（2026-10-20） ====================
        // 任务新增 note.project 字段（项目名，空字符串 = 未分类）。
        // projects 是项目登记表，用来保留「暂时没有任务」的空项目。
        let projects = [];
        try {
            const rawProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            if (Array.isArray(rawProjects)) {
                projects = rawProjects
                    .filter(p => typeof p === 'string' && p.trim())
                    .map(p => p.trim())
                    .filter((p, i, arr) => arr.indexOf(p) === i);
            }
        } catch (e) { projects = []; }

        let projectFilter = localStorage.getItem('projectFilter') || 'all';
        let groupByProject = localStorage.getItem('groupByProject') === 'true';
        // 【2026-10-22】录入区「项目」下拉记住上次的选择：
        // 同一个项目往往要连着录好几条任务，每次打开都回到「未分类」很烦。
        // 存在 localStorage 的 lastNoteProject 里，下次启动直接还原。
        let lastNoteProject = localStorage.getItem('lastNoteProject') || '';

        function saveProjects() {
            localStorage.setItem('projects', JSON.stringify(projects));
        }

        function projectNameOf(note) {
            return note && note.project ? String(note.project) : '';
        }

        function projectLabelOf(name) {
            return name || '未分类';
        }

        /** 项目排序：登记表顺序 → 未登记的历史项目 → 未分类 */
        function projectRank(name) {
            const p = name || '';
            if (!p) return 10000;
            const i = projects.indexOf(p);
            return i === -1 ? 9000 : i;
        }

        function projectColor(name) {
            if (!name) return '#8a8a8a';
            let h = 0;
            for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
            return 'hsl(' + h + ', 62%, 68%)';
        }

        function projectBadgeHtml(note) {
            const name = projectNameOf(note);
            // 还没有任何项目时不显示「未分类」徽标，避免无意义地占位置
            if (!name && projects.length === 0) return '';
            const color = projectColor(name);
            const bg = name ? color.replace('hsl(', 'hsla(').replace(')', ', 0.16)') : 'rgba(255,255,255,0.04)';
            const border = name ? color.replace('hsl(', 'hsla(').replace(')', ', 0.5)') : 'rgba(255,255,255,0.14)';
            return '<span class="project-tag' + (name ? '' : ' empty') + '" style="color:' + color +
                ';background:' + bg + ';border:1px solid ' + border + ';"' +
                ' onclick="setNoteProject(' + note.id + ')" title="点击归入 / 切换项目">📁 ' +
                escapeHtml(projectLabelOf(name)) + '</span>';
        }

        /** 把任务里出现过、但登记表没有的项目补进登记表（兼容旧数据 / 导入数据） */
        function collectProjectNames() {
            let changed = false;
            const add = name => {
                if (name && projects.indexOf(name) === -1) {
                    projects.push(name);
                    changed = true;
                }
            };
            notes.forEach(n => add(projectNameOf(n)));
            archivedNotes.forEach(n => add(projectNameOf(n)));
            if (changed) saveProjects();
            return changed;
        }

        function projectOptionsHtml(selected) {
            const option = (value, label) =>
                '<option value="' + escapeHtml(value).replace(/"/g, '&quot;') + '"' +
                (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
            let html = option('', '未分类');
            projects.forEach(p => { html += option(p, p); });
            return html;
        }

        /** 项目下拉框 / 筛选框 / 分组开关统一刷新 */
        function refreshProjectUI() {
            collectProjectNames();
            const filterSel = document.getElementById('projectFilterSelect');
            if (filterSel) {
                if (projectFilter !== 'all' && projectFilter !== '__none__' && projects.indexOf(projectFilter) === -1) {
                    projectFilter = 'all';
                    localStorage.setItem('projectFilter', 'all');
                }
                const selected = projectFilter === '__none__' ? '__none__' : projectFilter;
                filterSel.innerHTML = '<option value="all">全部项目</option><option value="__none__">未分类</option>' +
                    projects.map(p => '<option value="' + escapeHtml(p).replace(/"/g, '&quot;') + '">' +
                        escapeHtml(p) + '</option>').join('');
                filterSel.value = selected;
            }
            const noteSel = document.getElementById('noteProjectSelect');
            if (noteSel) {
                // 记住的项目如果被删掉了，就回落到「未分类」
                if (lastNoteProject && projects.indexOf(lastNoteProject) === -1) {
                    lastNoteProject = '';
                    localStorage.setItem('lastNoteProject', '');
                }
                // 首次渲染：还原上次选择；之后以当前选中项为准（用户可能刚手动改过）
                // 注意顺序：必须先把 options 铺好再赋值，否则赋的值在旧 options 里不存在会被丢弃
                const firstTime = noteSel.dataset.ppRestored !== '1';
                noteSel.dataset.ppRestored = '1';
                const want = firstTime ? (lastNoteProject || '') : (noteSel.value || '');
                noteSel.innerHTML = projectOptionsHtml(want);
                noteSel.value = (!want || projects.indexOf(want) !== -1) ? want : '';
            }
            const groupToggle = document.getElementById('groupByProjectToggle');
            if (groupToggle) groupToggle.checked = groupByProject;
        }

        function applyProjectFilter(list) {
            if (projectFilter === 'all') return list;
            if (projectFilter === '__none__') return list.filter(n => !projectNameOf(n));
            return list.filter(n => projectNameOf(n) === projectFilter);
        }


        // 【2026-09-30】日期是否显示年份（设置面板「日期显示年份」）：
        // 关掉后所有展示位置（表格视图 / 卡片 / 提醒徽标）统一变成 "09-30 18:45:31"，
        // 窄窗口下每处省 5 个字符宽度。默认开 = 保持原行为。
        let showYear = localStorage.getItem('showYear') !== 'false';

        let sortDirections = {
            time: 'asc',
            priority: 'asc',
            done: 'asc'
        };
        const savedSortDirections = localStorage.getItem('sortDirections');
        if (savedSortDirections) {
            try {
                sortDirections = JSON.parse(savedSortDirections);
            } catch(e) {}
        }

        // 给旧笔记添加默认type字段
        let needsSave = false;
        notes.forEach(note => {
            if (!note.type) {
                note.type = 'short';
                needsSave = true;
            }
        });
        if (needsSave) {
            localStorage.setItem('notes', JSON.stringify(notes));
        }

        // 软件启动时，自动将活跃笔记中已完成的任务移入归档
        const completedInNotes = notes.filter(n => n.done);
        if (completedInNotes.length > 0) {
            completedInNotes.forEach(n => {
                if (!n.doneTime) n.doneTime = n.ts || Date.now();
                archivedNotes.push(n);
            });
            notes = notes.filter(n => !n.done);
            localStorage.setItem('notes', JSON.stringify(notes));
            localStorage.setItem('archived_notes', JSON.stringify(archivedNotes));
        }

        function save() { 
            localStorage.setItem('notes', JSON.stringify(notes)); 
            // 【2026-10-20】立即让主进程把 app-data.json 落盘：
            // 平时 store.js 是 180ms 合并写入，异常关闭（任务管理器结束进程 / 断电）
            // 时最后一批任务可能来不及写；这里每次保存都催一次 flush，
            // 下次启动 preload 发现主进程副本更新会自动回填，图片引用也就不会丢。
            if (isElectron) {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('store:flush');
                } catch(e) {}
            }
            render(true); 
            if (currentView === 'table') renderTable(true);
            triggerImageGarbageCollection();
            if (isElectron) {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('sync-notes-to-float', notes);
                } catch(e) {}
            }
        }

        function saveArchive() {
            archiveRenderLimits = {};
            renderedArchiveCounts = {};
            localStorage.setItem('archived_notes', JSON.stringify(archivedNotes));
            if (isElectron) {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('store:flush');
                } catch(e) {}
            }
            renderArchiveHistory();
            if (currentView === 'table') renderTable(true);
            triggerImageGarbageCollection();
        }

        // 辅助判断是否是真正的图片 Base64（排除了 svg 懒加载占位图）
        function isRealBase64Image(src) {
            return src && src.startsWith('data:image/') && !src.startsWith('data:image/svg+xml');
        }

        // 延迟函数，让后台迁移温和地进行，不卡死主线程
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        // 迁移旧笔记中的 Base64 图片到本地文件存储，极大地减轻 localStorage 大小，防止长列表解析和重绘卡死
        async function migrateBase64Notes() {
            let notesChanged = false;
            let archiveChanged = false;
            
            // 1. 处理活跃笔记
            for (let note of notes) {
                // 仅当包含真实的图片 Base64（不是只有 svg 占位图）时才尝试迁移
                if (note.content && note.content.includes('data:image') && !note.content.includes('data:image/svg+xml;base64')) {
                    const newContent = await migrateContentImages(note.content);
                    if (newContent !== note.content) {
                        note.content = newContent;
                        notesChanged = true;
                    }
                    await sleep(30); // 每次处理一条，释放主线程
                }
                if (note.comments && note.comments.length > 0) {
                    for (let c of note.comments) {
                        if (c.text && c.text.includes('data:image') && !c.text.includes('data:image/svg+xml;base64')) {
                            const newText = await migrateContentImages(c.text);
                            if (newText !== c.text) {
                                c.text = newText;
                                notesChanged = true;
                            }
                            await sleep(30);
                        }
                    }
                }
            }
            
            // 2. 处理已完成归档笔记
            for (let note of archivedNotes) {
                if (note.content && note.content.includes('data:image') && !note.content.includes('data:image/svg+xml;base64')) {
                    const newContent = await migrateContentImages(note.content);
                    if (newContent !== note.content) {
                        note.content = newContent;
                        archiveChanged = true;
                    }
                    await sleep(30); // 每次处理一条，释放主线程
                }
                if (note.comments && note.comments.length > 0) {
                    for (let c of note.comments) {
                        if (c.text && c.text.includes('data:image') && !c.text.includes('data:image/svg+xml;base64')) {
                            const newText = await migrateContentImages(c.text);
                            if (newText !== c.text) {
                                c.text = newText;
                                archiveChanged = true;
                            }
                            await sleep(30);
                        }
                    }
                }
            }
            
            if (notesChanged) {
                localStorage.setItem('notes', JSON.stringify(notes));
            }
            if (archiveChanged) {
                localStorage.setItem('archived_notes', JSON.stringify(archivedNotes));
            }
            
            if (notesChanged || archiveChanged) {
                console.log('旧笔记中的 Base64 图片已全部迁移至本地存储！');
                render(true);
            }
        }

        // 辅助提取 HTML 内容里的 Base64 图片并调用主进程存盘
        async function migrateContentImages(htmlContent) {
            if (!htmlContent) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const imgs = tempDiv.getElementsByTagName('img');
            let hasChanged = false;
            
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                const src = img.getAttribute('src') || '';
                const dataSrc = img.getAttribute('data-src') || '';
                
                let targetBase64 = '';
                let isDataSrc = false;
                
                if (isRealBase64Image(dataSrc)) {
                    targetBase64 = dataSrc;
                    isDataSrc = true;
                } else if (isRealBase64Image(src)) {
                    targetBase64 = src;
                    isDataSrc = false;
                }
                
                if (targetBase64) {
                    try {
                        const { ipcRenderer } = require('electron');
                        const fileUrl = await ipcRenderer.invoke('save-note-image', targetBase64);
                        img.src = fileUrl;
                        if (isDataSrc) {
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy-img');
                            img.removeAttribute('data-lazy-observed');
                        }
                        hasChanged = true;
                        await sleep(20); // 给 I/O 留出空档
                    } catch (e) {
                        console.error('迁移 Base64 图片失败:', e);
                    }
                }
            }
            return hasChanged ? tempDiv.innerHTML : htmlContent;
        }

        // 异步图片垃圾回收 (GC) 触发器（带有 3 秒防抖节流保护，防止高频保存时引起重复 I/O）
        let gcTimeout = null;
        // 【2026-10-20】启动后 8 秒内不做 GC：给数据恢复 / 旧图片迁移留出时间，
        // 避免「本地数据还没回填完就按空引用清理图片」这种二次伤害。
        const gcNotBefore = Date.now() + 8000;
        function triggerImageGarbageCollection() {
            if (gcTimeout) clearTimeout(gcTimeout);
            gcTimeout = setTimeout(async () => {
                if (Date.now() < gcNotBefore) return;
                // 一条任务都没有时直接跳过：宁可留几个孤立文件，也不能把图片清空
                if (notes.length === 0 && archivedNotes.length === 0) return;

                const referencedFiles = [];
                const regex = /NoteImages\/(img_[a-zA-Z0-9_\-\.]+)/g;
                
                function extractReferencedImages(text) {
                    if (!text) return;
                    let match;
                    regex.lastIndex = 0;
                    while ((match = regex.exec(text)) !== null) {
                        referencedFiles.push(match[1]);
                    }
                }
                
                notes.forEach(note => {
                    extractReferencedImages(note.content);
                    if (note.comments) {
                        note.comments.forEach(c => extractReferencedImages(c.text));
                    }
                });
                
                archivedNotes.forEach(note => {
                    extractReferencedImages(note.content);
                    if (note.comments) {
                        note.comments.forEach(c => extractReferencedImages(c.text));
                    }
                });
                
                if (typeof require !== 'undefined') {
                    try {
                        const { ipcRenderer } = require('electron');
                        const result = await ipcRenderer.invoke('cleanup-unused-images', referencedFiles);
                        if (result.success && result.deletedCount > 0) {
                            console.log(`[GC] 成功清理了本地 ${result.deletedCount} 个无用缓存图片文件。`);
                        }
                    } catch(e) {
                        console.error('[GC] 图片垃圾回收失败:', e);
                    }
                }
            }, 3000);
        }

        function render(forceReset = false) {
            const list = document.getElementById('notesList');
            if (!list) return;
            
            if (forceReset) {
                list.innerHTML = '';
                renderedCardCount = 0;
                cardRenderLimit = 15;
                lastRenderedProjectGroup = null;
            }

            let startTs = 0;
            let endTs = 0;
            if (dateFilterMode === 'week') {
                const r = getThisWeekRange();
                startTs = r.start;
                endTs = r.end;
            } else if (dateFilterMode === 'all') {
                startTs = 0;
                endTs = Infinity;
            } else {
                const startVal = document.getElementById('filterStartDate').value;
                const endVal = document.getElementById('filterEndDate').value;
                if (startVal && endVal) {
                    startTs = new Date(startVal + 'T00:00:00').getTime();
                    endTs = new Date(endVal + 'T23:59:59').getTime();
                } else {
                    const r = getThisWeekRange();
                    startTs = r.start;
                    endTs = r.end;
                }
            }

            let listTasks = [];
            
            // 未完成任务不受日期过滤影响直接显示，已完成任务根据所选时间段进行筛选
            notes.forEach(n => {
                if (!n.done) {
                    listTasks.push(n);
                } else {
                    const doneT = n.doneTime || n.ts || Date.now();
                    if (doneT >= startTs && doneT <= endTs) {
                        listTasks.push(n);
                    }
                }
            });

            // 归档卡片同样受所选日期时间段的限制
            archivedNotes.forEach(n => {
                const doneT = n.doneTime || n.ts || Date.now();
                if (doneT >= startTs && doneT <= endTs) {
                    listTasks.push(n);
                }
            });

            let filtered = [...listTasks];
            if (currentFilter === 'undone') filtered = filtered.filter(x => !x.done);
            if (currentFilter === 'p3') filtered = filtered.filter(x => x.p === 3);
            if (currentFilter === 'p2') filtered = filtered.filter(x => x.p === 2);
            if (currentFilter === 'p1') filtered = filtered.filter(x => x.p === 1);
            
            // 类型过滤
            if (currentTypeView === 'short') filtered = filtered.filter(x => x.type === 'short');
            if (currentTypeView === 'long') filtered = filtered.filter(x => x.type === 'long');

            // 关键词搜索（M14-5）：标题 / 内容 / 评论一起匹配
            if (searchKeyword) {
                filtered = filtered.filter(x => matchKeyword(x, searchKeyword));
            }

            // 项目筛选（2026-10-20）：全部 / 未分类 / 指定项目
            filtered = applyProjectFilter(filtered);

            const compareTasks = (a, b) => {
                // 1. 先按完成状态排序：已完成的放下面
                const aDone = a.done ? 1 : 0;
                const bDone = b.done ? 1 : 0;
                if (aDone !== bDone) {
                    return aDone - bDone;
                }
                
                // 2. 再按优先级排序
                let priorityResult = 0;
                if (sortDirections.priority === 'asc') {
                    priorityResult = a.p - b.p;
                } else {
                    priorityResult = b.p - a.p;
                }
                if (priorityResult !== 0) {
                    return priorityResult;
                }
                
                // 3. 最后按时间排序
                if (sortDirections.time === 'asc') {
                    return a.ts - b.ts;
                } else {
                    return b.ts - a.ts;
                }
            };

            filtered.sort((a, b) => {
                // 按项目分组时，项目排在排序条件之前：
                // 同一项目内仍然按 完成状态 → 优先级 → 时间 排，保证分组内部顺序不打乱
                if (groupByProject) {
                    const d = projectRank(projectNameOf(a)) - projectRank(projectNameOf(b));
                    if (d !== 0) return d;
                }
                return compareTasks(a, b);
            });

            const projectCounts = {};
            if (groupByProject) {
                filtered.forEach(n => {
                    const key = projectNameOf(n);
                    projectCounts[key] = (projectCounts[key] || 0) + 1;
                });
            }

            // 增量范围：从已渲染的 renderedCardCount 到当前加载上限 cardRenderLimit
            const start = renderedCardCount;
            const end = Math.min(filtered.length, cardRenderLimit);
            
            if (start < end) {
                const toRender = filtered.slice(start, end);

                toRender.forEach(n => {
                if (groupByProject) {
                    const groupName = projectNameOf(n);
                    if (groupName !== lastRenderedProjectGroup) {
                        const groupHeader = document.createElement('div');
                        groupHeader.className = 'project-group-header';
                        groupHeader.innerHTML = '📁 ' + escapeHtml(projectLabelOf(groupName)) +
                            ' <span class="project-group-count">' + (projectCounts[groupName] || 0) + ' 项</span>';
                        list.appendChild(groupHeader);
                        lastRenderedProjectGroup = groupName;
                    }
                }
                const card = document.createElement('div');
                card.className = 'note-card';
                const pColor = n.p === 1 ? '#22cc88' : n.p === 2 ? '#ffcc00' : '#ff4444';
                const typeColor = n.type === 'short' ? '#2196F3' : '#9C27B0';
                const typeText = n.type === 'short' ? '短期' : '长期';
                
                if (!n.type) n.type = 'short';

                let commentsHtml = '';
                if (n.comments && n.comments.length > 0) {
                    commentsHtml = `<div class="comments-section">
                        ${n.comments.map((c, ci) => `
                            <div class="single-comment">
                                <span class="comment-text">${lazyloadifyHtml(renderCommentText(c.text))}</span>
                                <span class="comment-delete" onclick="deleteComment(${n.id}, ${ci})">✕</span>
                            </div>
                        `).join('')}
                    </div>`;
                }

                // 处理大图和表情懒加载，将 content 处理为 data-src 格式
                const contentHtml = lazyloadifyHtml(mdEnhanceHtml(n.content));

                const noteDateContent = n.done && n.doneTime 
                    ? `${formatDate(n.ts)} <span class="done-time-badge" style="background: rgba(76, 175, 80, 0.15); color: #81c784; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 500; border: 1px solid rgba(76, 175, 80, 0.3);">✓ 已完成: ${formatDate(n.doneTime)}</span>`
                    : formatDate(n.ts);

                // 提醒徽标（M14-3），点击可直接改时间
                const remindBadge = n.remindAt
                    ? `<span class="done-time-badge" style="background: rgba(255, 152, 0, 0.15); color: #ffb74d; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 500; border: 1px solid rgba(255, 152, 0, 0.3); cursor: pointer;" onclick="setReminder(${n.id})" title="点击修改 / 清除提醒">⏰ 提醒: ${formatDate(n.remindAt)}</span>`
                    : '';

                card.innerHTML = `
                    <div class="note-date">${noteDateContent}${remindBadge}</div>
                    <div class="note-content-editable" contenteditable="true" data-note-id="${n.id}" onblur="handleNoteBlur(this)" onkeydown="handleNoteKeydown(event)">${contentHtml}</div>
                    <div class="note-footer">
                        <div>
                            <span class="priority-tag" style="background:${pColor};color:#fff;cursor:pointer" onclick="togglePriority(${n.id})" title="点击切换优先级">${n.p === 1 ? '低' : n.p === 2 ? '中' : '高'}</span>
                            <span class="type-tag" style="background:${typeColor};color:#fff;cursor:pointer" onclick="toggleType(${n.id})" title="点击切换类型">${typeText}</span>
                            ${projectBadgeHtml(n)}
                            <span class="status-tag ${n.done ? 'status-done' : 'status-undone'}" style="cursor:pointer" onclick="toggleDone(${n.id})" title="点击切换完成状态">${n.done ? '已完成' : '未完成'}</span>
                        </div>
                        <div class="note-actions">
                            <span class="icon" title="设置提醒" onclick="setReminder(${n.id})" style="font-size: 14px;">⏰</span>
                            <span class="icon" title="完成" onclick="toggleDone(${n.id})"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
                            <span class="icon" title="评论" onclick="toggleComment(${n.id})"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/></svg></span>
                            <span class="icon" title="删除" onclick="deleteNote(${n.id})"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></span>
                        </div>
                    </div>
                    ${commentsHtml}
                    <div class="comment-input-area" id="commentArea_${n.id}" style="display:none">
                        <div class="comment-input-wrapper">
                            <div class="comment-input" id="c_${n.id}" contenteditable="true" data-placeholder="添加批注…" onkeydown="handleCommentKeydown(event, ${n.id})"></div>
                        </div>
                        <button class="emoji-toggle" onclick="toggleEmojiPanel(${n.id})">表情包</button>
                        <button class="send-btn" onclick="addComment(${n.id})">发送</button>
                    </div>
                    <div class="emoji-panel" id="emoji_${n.id}">
                        <button class="emoji-import-btn" onclick="importMeme(${n.id})" title="导入表情包">+</button>
                        ${memeImages.map(img => `<img class="emoji lazy-img" data-src="表情包/${img}" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==" onclick="insertEmoji('c_${n.id}', ${n.id}, '${img}')" />`).join('')}
                    </div>
                `;
                list.appendChild(card);
            });
                renderedCardCount = end;
            }

            // 滚动加载哨兵机制
            const sentinel = document.getElementById('notesListSentinel');
            if (sentinel) {
                if (filtered.length > renderedCardCount) {
                    sentinel.style.display = 'block';
                    sentinel.textContent = `向下滚动加载更多历史任务 (已展示 ${renderedCardCount}/${filtered.length})`;
                } else {
                    sentinel.style.display = 'none';
                }
            }

            // 重新绑定观察器
            bindLazyImages();
            bindSentinelObserver();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ==================== Markdown 轻量渲染（2026-10-27） ====================
        // 任务内容和批注都支持一小撮常用 markdown，够用又不至于把纯文本改坏：
        //   行内：**粗体**  *斜体*  ~~删除线~~  `代码`  [文字](https://链接)
        //   整行：# ~ #### 标题、- / * / + 列表、1. 有序列表、> 引用、--- 分隔线
        // 只认「成对、紧贴文字」的标记：3 * 4 * 5、__init__.py、snake_case 都不会被误伤。
        // 幂等：转换出来的 HTML 里已经没有标记符，重复渲染不会叠加。

        /** 行内强调（粗/删/斜），作用在「已转义」的文本上 */
        function mdEmphasis(s) {
            if (!s) return s;
            // 粗体 **x**（不跨行，标记内侧不能是空格）
            // 【注意】故意不支持 __x__：Python 的 __init__ 这类名字比 "__粗__" 常见得多
            s = s.replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, '<strong>$1</strong>');
            // 删除线 ~~x~~
            s = s.replace(/~~(?=\S)([^\n]*?\S)~~/g, '<del>$1</del>');
            // 斜体 *x*：前面不能是单词字符或另一个星号，后面不能紧跟星号
            s = s.replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\*)/g, '$1<em>$2</em>');
            // 斜体 _x_：两侧都要词边界，snake_case / _private / 文件名不动
            s = s.replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>');
            return s;
        }

        /** 行内 markdown 全量（含代码、链接） */
        function mdInline(s) {
            if (!s) return s;
            const codes = [], links = [];
            // 行内代码和链接先抽出来占位，免得里面的 * _ 被当成强调标记
            s = s.replace(/`([^`\n]+)`/g, (m, p1) => { codes.push(p1); return '\u0001' + (codes.length - 1) + '\u0001'; });
            s = s.replace(/\[([^\]\n]{1,120})\]\((https?:\/\/[^)\s]{1,500})\)/g, (m, text, url) => {
                links.push([text, url]); return '\u0002' + (links.length - 1) + '\u0002';
            });
            s = mdEmphasis(s);
            s = s.replace(/\u0002(\d+)\u0002/g, (m, i) => {
                const pair = links[+i] || ['', ''];
                return '<span class="md-link" data-href="' + pair[1] + '" title="' + pair[1] +
                    '" onclick="openMdLink(event, this)">' + mdEmphasis(pair[0]) + '</span>';
            });
            s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => '<code class="md-code">' + (codes[+i] || '') + '</code>');
            return s;
        }

        /** 整行 markdown（标题 / 列表 / 引用 / 分隔线）；不是整行语法就返回 null */
        function mdBlockHtml(escapedLine) {
            let m;
            if ((m = /^[ \t]*(#{1,6})[ \t]+(.*)$/.exec(escapedLine))) {
                const lvl = Math.min(m[1].length, 4);
                return '<span class="md-h md-h' + lvl + '">' + mdInline(m[2]) + '</span>';
            }
            if ((m = /^[ \t]*[-*+][ \t]+(.*)$/.exec(escapedLine))) {
                return '<span class="md-li">' + mdInline(m[1]) + '</span>';
            }
            if ((m = /^[ \t]*(\d{1,3})[.)][ \t]+(.*)$/.exec(escapedLine))) {
                return '<span class="md-li md-ol" data-no="' + m[1] + '">' + mdInline(m[2]) + '</span>';
            }
            if ((m = /^[ \t]*&gt;[ \t]?(.*)$/.exec(escapedLine))) {
                return '<span class="md-quote">' + mdInline(m[1]) + '</span>';
            }
            if (/^[ \t]*(-{3,}|\*{3,}|_{3,})[ \t]*$/.test(escapedLine)) {
                return '<span class="md-hr"></span>';
            }
            return null;
        }

        /** 一行纯文本 → HTML（先整行语法，再行内语法） */
        function mdLineToHtml(text) {
            const escaped = escapeHtml(String(text == null ? '' : text));
            const block = mdBlockHtml(escaped);
            return block !== null ? block : mdInline(escaped);
        }

        /** 纯文本（批注）→ HTML，保留换行 */
        function mdTextToHtml(text) {
            return String(text == null ? '' : text).split('\n').map(mdLineToHtml).join('<br>');
        }

        /**
         * 把 contenteditable 存下来的 HTML 里的纯文字按 markdown 增强。
         * 只改文本节点，不碰已有标签；没有标记符时原样返回（开销可忽略）。
         */
        function mdEnhanceHtml(html) {
            if (typeof html !== 'string' || !html) return html;
            if (!/[#>*_~`+-]|\d[.)][ \t]|<h[1-6][\s>]|<a[\s>]/i.test(html)) return html;
            let tpl;
            try {
                tpl = document.createElement('template');
                tpl.innerHTML = html;
            } catch (e) { return html; }
            // 【2026-11-05】粘贴进来的 <table> 是真实表格：别把单元格里的 "#" / "-" / "*"
            // 当成 markdown 标题或列表渲染，否则表格会被 display:block 的 span 撑乱。
            const SKIP = {
                CODE: 1, PRE: 1, IMG: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1,
                TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1,
                VIDEO: 1, AUDIO: 1, SOURCE: 1, IFRAME: 1
            };
            const walk = (node) => {
                Array.from(node.childNodes).forEach(child => {
                    if (child.nodeType === 3) {
                        const text = child.nodeValue;
                        if (!text || !/[#>*_~`+-]|\d[.)]/.test(text)) return;
                        const escaped = escapeHtml(text);
                        // 文本节点里可能带软换行（contenteditable 偶尔会这么存），逐行判断语法但保留换行
                        const out = text.indexOf('\n') === -1
                            ? mdLineToHtml(text)
                            : text.split('\n').map(mdLineToHtml).join('\n');
                        if (out === escaped) return;   // 没有可渲染的语法，保持原节点不动
                        const holder = document.createElement('span');
                        holder.innerHTML = out;
                        child.replaceWith(...Array.from(holder.childNodes));
                    } else if (child.nodeType === 1) {
                        // 代码块只加样式，里面的内容不参与 markdown 增强（SKIP 里已含 PRE，这里先接住）
                        if (child.tagName === 'PRE') {
                            if (!child.className) child.className = 'md-pre';
                            return;
                        }
                        if (SKIP[child.tagName]) return;
                        // AI / 接口写进来的内容可能直接是 HTML 标题、链接：
                        // 换成和 markdown 一样的样式，避免 <h1> 按浏览器默认尺寸把卡片撑爆
                        if (/^H[1-6]$/.test(child.tagName)) {
                            const lvl = Math.min(Number(child.tagName[1]), 4);
                            const span = document.createElement('span');
                            span.className = 'md-h md-h' + lvl;
                            while (child.firstChild) span.appendChild(child.firstChild);
                            child.replaceWith(span);
                            walk(span);
                            return;
                        }
                        if (child.tagName === 'A') {
                            const href = child.getAttribute('href') || '';
                            if (!/^https?:\/\//i.test(href)) {
                                // javascript: / data: / 相对路径：只留文字，别在卡片里留一个可点链接
                                const holder = document.createElement('span');
                                while (child.firstChild) holder.appendChild(child.firstChild);
                                walk(holder);
                                child.replaceWith(...Array.from(holder.childNodes));
                                return;
                            }
                            const span = document.createElement('span');
                            span.className = 'md-link';
                            span.setAttribute('data-href', href);
                            span.setAttribute('title', href);
                            span.setAttribute('onclick', 'openMdLink(event, this)');
                            while (child.firstChild) span.appendChild(child.firstChild);
                            child.replaceWith(span);
                            walk(span);
                            return;
                        }
                        if (child.tagName === 'PRE' && !child.className) child.className = 'md-pre';
                        walk(child);
                    }
                });
            };
            walk(tpl.content);
            return tpl.innerHTML;
        }

        /** 点击 md 链接：Electron 里交给主进程用系统浏览器打开，网页版直接新开标签 */
        window.openMdLink = (ev, el) => {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            const url = el && el.getAttribute && el.getAttribute('data-href');
            if (!url || !/^https?:\/\//i.test(url)) return;
            try {
                if (isElectron) require('electron').ipcRenderer.send('open-external', url);
                else window.open(url, '_blank', 'noopener');
            } catch (e) {
                try { navigator.clipboard.writeText(url); } catch (_) { }
                showAppToast('链接已复制：' + url);
            }
        };

        let isArchiveExpanded = false;
        let expandedArchiveGroups = {}; // 存储按天展开的日期 key，格式为 { '2026-06-29': true }

        window.toggleArchiveMainPanel = () => {
            isArchiveExpanded = !isArchiveExpanded;
            const mainList = document.getElementById('archiveMainList');
            const arrow = document.getElementById('archiveMainArrow');
            const header = document.getElementById('archiveHeader');
            if (isArchiveExpanded) {
                mainList.style.display = 'block';
                arrow.textContent = '▼';
                header.classList.add('active');
                renderArchiveHistory();
            } else {
                mainList.style.display = 'none';
                arrow.textContent = '▶';
                header.classList.remove('active');
            }
        };

        window.toggleArchiveGroup = dateStr => {
            expandedArchiveGroups[dateStr] = !expandedArchiveGroups[dateStr];
            const groupContent = document.getElementById(`archive_group_${dateStr}`);
            const arrow = document.getElementById(`archive_group_arrow_${dateStr}`);
            const header = document.getElementById(`archive_group_header_${dateStr}`);
            if (expandedArchiveGroups[dateStr]) {
                groupContent.style.display = 'block';
                arrow.textContent = '▼';
                header.classList.add('active');
                renderArchiveGroupItems(dateStr);
            } else {
                groupContent.style.display = 'none';
                arrow.textContent = '▶';
                header.classList.remove('active');
            }
        };

        function renderArchiveHistory() {
            const mainList = document.getElementById('archiveMainList');
            const mainCount = document.getElementById('archiveMainCount');
            
            mainCount.textContent = archivedNotes.length;
            
            if (!isArchiveExpanded) return;
            
            if (archivedNotes.length === 0) {
                mainList.innerHTML = '<div style="text-align: center; color: #888; padding: 20px; font-size: 14px;">暂无归档历史</div>';
                return;
            }
            
            // 按天分组
            const groups = {};
            archivedNotes.forEach(n => {
                const d = new Date(n.doneTime || n.ts || Date.now());
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!groups[dateStr]) {
                    groups[dateStr] = [];
                }
                groups[dateStr].push(n);
            });
            
            // 排序日期
            const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
            
            let html = '';
            html += `<div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button class="archive-btn-delete" style="font-size: 12px; padding: 5px 12px;" onclick="clearArchiveHistory(event)">清空所有归档</button>
            </div>`;

            sortedDates.forEach(dateStr => {
                const count = groups[dateStr].length;
                const weekday = getWeekday(dateStr);
                const isGroupExpanded = !!expandedArchiveGroups[dateStr];
                const arrow = isGroupExpanded ? '▼' : '▶';
                const activeClass = isGroupExpanded ? 'active' : '';
                const displayStyle = isGroupExpanded ? 'block' : 'none';
                
                html += `
                    <div class="archive-group">
                        <div class="archive-group-header ${activeClass}" id="archive_group_header_${dateStr}" onclick="toggleArchiveGroup('${dateStr}')">
                            <span>📅 ${dateStr} (${weekday})</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="archive-header-count">${count} 个任务</span>
                                <span class="archive-group-arrow" id="archive_group_arrow_${dateStr}">${arrow}</span>
                            </div>
                        </div>
                        <div class="archive-group-content" id="archive_group_${dateStr}" style="display: ${displayStyle};">
                            <!-- 具体任务延迟到展开时渲染 -->
                        </div>
                    </div>
                `;
            });
            
            mainList.innerHTML = html;
            
            // 如果有些组之前是展开的，重新把它们的内容画一下
            sortedDates.forEach(dateStr => {
                if (expandedArchiveGroups[dateStr]) {
                    renderArchiveGroupItems(dateStr, groups[dateStr]);
                }
            });
        }

        function renderArchiveGroupItems(dateStr, groupNotes) {
            const groupContent = document.getElementById(`archive_group_${dateStr}`);
            if (!groupContent) return;
            
            if (!groupNotes) {
                groupNotes = archivedNotes.filter(n => {
                    const d = new Date(n.doneTime || n.ts || Date.now());
                    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return dStr === dateStr;
                });
            }

            // 搜索：归档区同样按关键词过滤
            if (searchKeyword) {
                groupNotes = groupNotes.filter(n => matchKeyword(n, searchKeyword));
            }
            // 项目筛选：归档区与活跃区保持一致
            groupNotes = applyProjectFilter(groupNotes);
            
            groupNotes.sort((a, b) => (b.doneTime || b.ts || 0) - (a.doneTime || a.ts || 0));
            
            const limit = archiveRenderLimits[dateStr] || 15;
            const toRender = groupNotes.slice(0, limit);

            let html = '';
            toRender.forEach(n => {
                const doneDate = new Date(n.doneTime || n.ts || Date.now());
                const timeStr = `${String(doneDate.getHours()).padStart(2, '0')}:${String(doneDate.getMinutes()).padStart(2, '0')}:${String(doneDate.getSeconds()).padStart(2, '0')}`;
                
                const pColor = n.p === 1 ? '#22cc88' : n.p === 2 ? '#ffcc00' : '#ff4444';
                const pText = n.p === 1 ? '低' : n.p === 2 ? '中' : '高';
                
                const typeColor = n.type === 'long' ? '#9C27B0' : '#2196F3';
                const typeText = n.type === 'long' ? '长期' : '短期';
                
                let bodyContent = mdEnhanceHtml(n.content);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = bodyContent;
                const imgs = tempDiv.getElementsByTagName('img');
                for (let i = 0; i < imgs.length; i++) {
                    const src = imgs[i].src || imgs[i].getAttribute('src');
                    imgs[i].setAttribute('onclick', `zoomImage(event, "${src.replace(/"/g, '\\"')}")`);
                    imgs[i].title = '点击放大图片';
                }
                bodyContent = lazyloadifyHtml(tempDiv.innerHTML);

                let commentsHtml = '';
                if (n.comments && n.comments.length > 0) {
                    commentsHtml = `<div class="comments-section" style="margin-top: 10px;">
                        ${n.comments.map((c, ci) => `
                            <div class="single-comment">
                                <span class="comment-text">${lazyloadifyHtml(renderCommentText(c.text))}</span>
                                <span class="comment-delete" onclick="deleteComment(${n.id}, ${ci})">✕</span>
                            </div>
                        `).join('')}
                    </div>`;
                }
                
                html += `
                    <div class="archive-item" style="flex-direction: column; align-items: stretch; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <div class="archive-item-left">
                                <div class="archive-item-content">${bodyContent}</div>
                                <div class="archive-item-meta">
                                    <span class="archive-time-tag">✓ 完成时间: ${timeStr}</span>
                                    <span style="background:${pColor}; color:#fff; padding:1px 6px; border-radius:4px; font-size:10px;">${pText}</span>
                                    <span style="background:${typeColor}; color:#fff; padding:1px 6px; border-radius:4px; font-size:10px;">${typeText}</span>
                                    ${projectBadgeHtml(n)}
                                </div>
                            </div>
                            <div class="archive-item-right" style="flex-shrink: 0;">
                                <button class="archive-btn-recover" onclick="toggleComment(${n.id})" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #ccc;">评论</button>
                                <button class="archive-btn-recover" onclick="recoverArchive(${n.id})">恢复</button>
                                <button class="archive-btn-delete" onclick="deleteArchive(${n.id})">删除</button>
                            </div>
                        </div>
                        
                        ${commentsHtml}
                        
                        <div class="comment-input-area" id="commentArea_${n.id}" style="display:none; width: 100%;">
                            <div class="comment-input-wrapper" style="flex: 1;">
                                <div class="comment-input" id="c_${n.id}" contenteditable="true" data-placeholder="添加批注…" onkeydown="handleCommentKeydown(event, ${n.id})"></div>
                            </div>
                            <button class="emoji-toggle" onclick="toggleEmojiPanel(${n.id})">表情包</button>
                            <button class="send-btn" onclick="addComment(${n.id})">发送</button>
                        </div>
                        <div class="emoji-panel" id="emoji_${n.id}">
                            <button class="emoji-import-btn" onclick="importMeme(${n.id})" title="导入表情包">+</button>
                            ${memeImages.map(img => `<img class="emoji lazy-img" data-src="表情包/${img}" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==" onclick="insertEmoji('c_${n.id}', ${n.id}, '${img}')" />`).join('')}
                        </div>
                    </div>
                `;
            });

            if (groupNotes.length > limit) {
                html += `
                    <div class="archive-sentinel" id="archive_sentinel_${dateStr}" data-date="${dateStr}" style="height: 35px; line-height: 35px; text-align: center; color: #aaa; font-size: 12px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px dashed rgba(255,255,255,0.05); margin-top: 10px; cursor: pointer;">
                        向下滚动加载更多历史已完成任务 (已展示 ${limit}/${groupNotes.length})
                    </div>
                `;
            }
            
            groupContent.innerHTML = html;

            bindLazyImages();
            bindSentinelObserver();
        }
        
        function getWeekday(dateStr) {
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const d = new Date(dateStr);
            return weekdays[d.getDay()];
        }

        // ---------------- 微信风格图片大图浏览器核心模块 ----------------
        (function() {
            let isEditing = false;
            let currentScale = 1;
            let currentTranslate = { x: 0, y: 0 };
            let isDragging = false;
            let hasDragged = false; // 本次按下是否已产生位移（用于区分点击 / 拖动 / 长按）
            let startDragPos = { x: 0, y: 0 };
            let startTranslate = { x: 0, y: 0 };
            
            // 绘图相关
            let currentTool = 'brush'; // 'brush' or 'rect'
            let currentColor = '#ff4444';
            let strokeWidth = 4;
            let isDrawing = false;
            let lastDrawPos = { x: 0, y: 0 };
            let drawHistory = [];
            let tempFrameData = null; // 用于矩形框拖动预览

            // 长按检测
            let pressTimer = null;
            let isPressing = false;

            // DOM 引用
            let modal, modalImg, viewport, imgContainer, canvas, ctx;
            let editBtn, editToolbar, actionSheet;
            let brushBtn, rectBtn, undoBtn, cancelBtn, doneBtn;
            let copyBtn, sheetCancelBtn, toast;
            
            // 来源 Image 的引用，以便点击“完成”时回写
            let triggerSourceImg = null;
            let originalImageSrc = ''; // 记录未修改前的底图，取消时恢复

            function initDoms() {
                modal = document.getElementById('imgModal');
                modalImg = document.getElementById('modalImg');
                viewport = document.getElementById('wechatViewport');
                imgContainer = document.getElementById('wechatImgContainer');
                canvas = document.getElementById('wechatPainterCanvas');
                ctx = canvas ? canvas.getContext('2d') : null;

                editBtn = document.getElementById('wechatEditBtn');
                editToolbar = document.getElementById('wechatEditToolbar');
                actionSheet = document.getElementById('wechatActionSheet');
                
                brushBtn = document.getElementById('wechatBrushBtn');
                rectBtn = document.getElementById('wechatRectBtn');
                undoBtn = document.getElementById('wechatUndoBtn');
                cancelBtn = document.getElementById('wechatCancelBtn');
                doneBtn = document.getElementById('wechatDoneBtn');
                
                copyBtn = document.getElementById('wechatCopyBtn');
                sheetCancelBtn = document.getElementById('wechatSheetCancelBtn');
                toast = document.getElementById('wechatToast');

                bindEvents();
            }

            // 基准尺寸缓存：容器未缩放时的真实布局尺寸。
            // 必须在 scale=1 且无过渡的状态下测量并缓存，否则会读到缩放中的中间值，
            // 导致拖动时 limit 每帧递增、图片被不断往外推（表现为“拖动时越拖越大”）。
            let baseSize = { w: 0, h: 0 };

            function measureBaseSize() {
                const prevTransform = imgContainer.style.transform;
                const prevTransition = imgContainer.style.transition;
                // 临时清空 transform / transition，确保测到的是未经缩放的布局尺寸
                imgContainer.style.transition = 'none';
                imgContainer.style.transform = 'none';
                baseSize = {
                    w: imgContainer.offsetWidth,
                    h: imgContainer.offsetHeight
                };
                imgContainer.style.transform = prevTransform;
                imgContainer.style.transition = prevTransition;
            }

            // 限制拖动范围算法，防止图片边缘缩入视口。
            // 使用缓存的基准尺寸 * scale，而不是实时读取 clientWidth，
            // 这样 limit 在整段拖动过程中恒定，图片不会自己越飘越远。
            function calculateDragLimit(scale) {
                if (!baseSize.w || !baseSize.h) measureBaseSize();

                const imgW = baseSize.w * scale;
                const imgH = baseSize.h * scale;
                const viewW = viewport.clientWidth;
                const viewH = viewport.clientHeight;

                const limitX = Math.max(0, (imgW - viewW) / 2);
                const limitY = Math.max(0, (imgH - viewH) / 2);
                return { x: limitX, y: limitY };
            }

            // 统一应用变换：translate 放在 scale 之后（写成 scale() translate()），
            // 让位移量不受缩放倍数影响，拖动 1px 屏幕就移动 1px，手感才正确。
            function applyTransform() {
                imgContainer.style.transform =
                    `scale(${currentScale}) translate(${currentTranslate.x}px, ${currentTranslate.y}px)`;
            }

            function bindEvents() {
                // 1. 双击与拖拽
                viewport.addEventListener('mousedown', function(e) {
                    if (isEditing) return;
                    if (e.button === 0) { // 左键：准备拖拽 + 长按判定
                        // 注意：这里不能立刻把 isDragging 置为 true，否则长按回调里
                        // 的 !isDragging 永远为 false，长按菜单再也弹不出来。
                        isDragging = false;
                        hasDragged = false;
                        startDragPos = { x: e.clientX, y: e.clientY };
                        startTranslate = { ...currentTranslate };

                        isPressing = true;
                        clearTimeout(pressTimer);
                        pressTimer = setTimeout(() => {
                            // 500ms 内没有产生位移，才判定为长按
                            if (isPressing && !hasDragged) {
                                isPressing = false;
                                showActionSheet(true);
                            }
                        }, 500);
                    } else if (e.button === 2) { // 右键直接弹出菜单
                        e.preventDefault();
                        showActionSheet(true);
                    }
                });

                viewport.addEventListener('mousemove', function(e) {
                    if (isEditing) return;
                    if (!isPressing && !isDragging) return;

                    const dx = e.clientX - startDragPos.x;
                    const dy = e.clientY - startDragPos.y;

                    // 超过阈值才正式进入拖拽，避免手抖被当成拖动
                    if (!hasDragged) {
                        if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
                        hasDragged = true;
                        isDragging = true;
                        isPressing = false;
                        clearTimeout(pressTimer);
                    }

                    // 未放大时不拖动，交给点击/双击逻辑处理
                    if (currentScale <= 1) return;

                    let tx = startTranslate.x + dx;
                    let ty = startTranslate.y + dy;

                    // 限制边界
                    const limit = calculateDragLimit(currentScale);
                    tx = Math.max(-limit.x, Math.min(limit.x, tx));
                    ty = Math.max(-limit.y, Math.min(limit.y, ty));

                    currentTranslate = { x: tx, y: ty };

                    // 拖动过程中禁用 transition，否则每帧都会重新触发 0.22s 缓动，
                    // 视觉上表现为图片持续“追”着鼠标放大漂移。
                    imgContainer.style.transition = 'none';
                    applyTransform();
                });

                window.addEventListener('mouseup', function() {
                    // 拖拽结束后恢复过渡动画，用于双击/还原时的平滑效果
                    if (isDragging) {
                        imgContainer.style.transition = '';
                    }
                    isDragging = false;
                    isPressing = false;
                    clearTimeout(pressTimer);
                });

                // 点击视口外部（即视口上的空白背景）关闭预览
                viewport.addEventListener('click', function(e) {
                    // 刚刚发生过拖动则忽略本次 click，避免拖完松手误关闭大图
                    if (hasDragged) return;
                    if (e.target === viewport) {
                        if (!isEditing && actionSheet.classList.contains('show') === false) {
                            closeWeChatModal();
                        }
                    }
                });

                // 双击放大缩小
                viewport.addEventListener('dblclick', function(e) {
                    if (isEditing) return;
                    if (currentScale > 1.05) {
                        // 还原
                        currentScale = 1;
                        currentTranslate = { x: 0, y: 0 };
                        applyTransform();
                    } else {
                        // 放大：以双击点为焦点。
                        // 用视口中心作为参照系（视口不参与变换），而不是读取 imgContainer
                        // 的包围盒 —— 后者在缩放 / 过渡中读到的是变形后的矩形，焦点会算歪。
                        if (!baseSize.w || !baseSize.h) measureBaseSize();
                        const viewRect = viewport.getBoundingClientRect();
                        const clickX = e.clientX - viewRect.left - viewRect.width / 2;
                        const clickY = e.clientY - viewRect.top - viewRect.height / 2;

                        currentScale = 2.5;
                        let tx = -clickX * (currentScale - 1) / currentScale;
                        let ty = -clickY * (currentScale - 1) / currentScale;

                        const limit = calculateDragLimit(currentScale);
                        tx = Math.max(-limit.x, Math.min(limit.x, tx));
                        ty = Math.max(-limit.y, Math.min(limit.y, ty));

                        currentTranslate = { x: tx, y: ty };
                        applyTransform();
                    }
                });

                // 2. 绘图画板交互
                canvas.addEventListener('mousedown', function(e) {
                    if (!isEditing || e.button !== 0) return;
                    isDrawing = true;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    lastDrawPos = { x, y };

                    // 备份历史以供撤销
                    drawHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    if (drawHistory.length > 20) drawHistory.shift();

                    if (currentTool === 'rect') {
                        tempFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    }
                });

                canvas.addEventListener('mousemove', function(e) {
                    if (!isDrawing || !isEditing) return;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    ctx.strokeStyle = currentColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (currentTool === 'brush') {
                        ctx.beginPath();
                        ctx.moveTo(lastDrawPos.x, lastDrawPos.y);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        lastDrawPos = { x, y };
                    } else if (currentTool === 'rect') {
                        // 矩形拖动预览：恢复到 mousedown 时的帧，然后画新矩形
                        ctx.putImageData(tempFrameData, 0, 0);
                        ctx.strokeRect(lastDrawPos.x, lastDrawPos.y, x - lastDrawPos.x, y - lastDrawPos.y);
                    }
                });

                canvas.addEventListener('mouseup', function() {
                    isDrawing = false;
                });

                // 3. 编辑工具栏事件
                editBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    enterEditMode(true);
                });

                brushBtn.addEventListener('click', function() {
                    currentTool = 'brush';
                    brushBtn.classList.add('active');
                    rectBtn.classList.remove('active');
                });

                rectBtn.addEventListener('click', function() {
                    currentTool = 'rect';
                    rectBtn.classList.add('active');
                    brushBtn.classList.remove('active');
                });

                // 颜色选择器
                const dots = document.querySelectorAll('.wechat-color-dot');
                dots.forEach(dot => {
                    dot.addEventListener('click', function() {
                        dots.forEach(d => d.classList.remove('active'));
                        dot.classList.add('active');
                        currentColor = dot.getAttribute('data-color');
                    });
                });

                undoBtn.addEventListener('click', function() {
                    if (drawHistory.length > 0) {
                        ctx.putImageData(drawHistory.pop(), 0, 0);
                    } else {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                });

                cancelBtn.addEventListener('click', function() {
                    enterEditMode(false);
                    modalImg.src = originalImageSrc; // 恢复原状
                });

                doneBtn.addEventListener('click', function() {
                    finishEditing();
                });

                // 4. ActionSheet 复制事件
                copyBtn.addEventListener('click', function() {
                    copyImageToClipboard();
                });

                sheetCancelBtn.addEventListener('click', function() {
                    showActionSheet(false);
                });
            }

            function enterEditMode(enter) {
                isEditing = enter;
                if (enter) {
                    // 恢复 1.0 倍大小
                    currentScale = 1;
                    currentTranslate = { x: 0, y: 0 };
                    imgContainer.style.transition = '';
                    applyTransform();
                    
                    // 激活 Canvas 物理宽高（与大图在物理屏幕上显示的大小完美一致）
                    canvas.width = modalImg.clientWidth;
                    canvas.height = modalImg.clientHeight;
                    canvas.style.display = 'block';

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawHistory = [];

                    editBtn.style.display = 'none';
                    editToolbar.classList.add('show');
                } else {
                    canvas.style.display = 'none';
                    editBtn.style.display = 'block';
                    editToolbar.classList.remove('show');
                }
            }

            function finishEditing() {
                // 合成底图和画板图，以底图的真实原始像素尺寸 (naturalWidth x naturalHeight) 为准，确保清晰度不被压缩！
                const naturalW = modalImg.naturalWidth;
                const naturalH = modalImg.naturalHeight;
                
                const mergeCanvas = document.createElement('canvas');
                mergeCanvas.width = naturalW;
                mergeCanvas.height = naturalH;
                const mergeCtx = mergeCanvas.getContext('2d');

                // 1. 绘制高清原图
                mergeCtx.drawImage(modalImg, 0, 0);

                // 2. 缩放画布上下文，将屏幕尺寸的 Canvas 映射到原始尺寸
                const scaleX = naturalW / canvas.width;
                const scaleY = naturalH / canvas.height;
                mergeCtx.scale(scaleX, scaleY);

                // 3. 将画板涂鸦绘制到高清原图上
                mergeCtx.drawImage(canvas, 0, 0);

                // 4. 导出合并图
                const finalDataUrl = mergeCanvas.toDataURL('image/png');
                modalImg.src = finalDataUrl;

                // 5. 将编辑后的图片回写到触发它的原网页图片中
                if (triggerSourceImg) {
                    triggerSourceImg.src = finalDataUrl;
                    
                    // 触发可能挂载在原 Image 上的 change 或是 input 事件，保证如果它是便签的，便签会自动存档！
                    triggerSourceImg.dispatchEvent(new Event('input', { bubbles: true }));
                    triggerSourceImg.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // 检查便签应用是否提供了全局更新笔记接口
                    setTimeout(() => {
                        const noteEditable = triggerSourceImg.closest('[contenteditable="true"]');
                        if (noteEditable) {
                            noteEditable.dispatchEvent(new Event('input', { bubbles: true }));
                            const noteIdAttr = noteEditable.getAttribute('id'); 
                            if (noteIdAttr && window.updateTableNote) {
                                const match = noteIdAttr.match(/\d+/);
                                if (match) {
                                    window.updateTableNote(match[0], noteEditable);
                                }
                            }
                        }
                    }, 100);
                }

                enterEditMode(false);
                showToast("编辑已保存");
            }

            function showActionSheet(show) {
                if (show) {
                    actionSheet.classList.add('show');
                } else {
                    actionSheet.classList.remove('show');
                }
            }

            /**
             * 复制大图到系统剪贴板。
             * 之前这里用 nativeImage.createFromDataURL(modalImg.src)，而图片存的是
             * file:// 本地路径 —— createFromDataURL 只认 data URL，于是复制必然失败。
             * 现在统一走主进程：先把 file:// / http:// / data: 解析成真实字节，再写剪贴板，
             * 因此复制出来的图可以直接粘进微信。
             */
            function copyImageToClipboard() {
                const src = modalImg.getAttribute('data-src') || modalImg.src;
                if (!src) return;
                showActionSheet(false);
                if (typeof copyImageToSystemClipboard === 'function') {
                    copyImageToSystemClipboard(src, 'bitmap');
                    return;
                }
                showToast('当前环境不支持复制到系统剪贴板');
            }

            function showToast(message) {
                toast.textContent = message;
                toast.style.opacity = '1';
                setTimeout(() => {
                    toast.style.opacity = '0';
                }, 1500);
            }

            function closeWeChatModal() {
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.style.display = 'none';
                    enterEditMode(false);
                }, 200);
            }

            // 对外公开微信风格大图拉起方法，完美重构原有的 window.zoomImage!
            window.zoomImage = function(e, src) {
                if (e) e.stopPropagation();
                if (!modal) {
                    initDoms();
                }
                
                triggerSourceImg = (e && e.target && e.target.tagName === 'IMG') ? e.target : null;
                originalImageSrc = src;

                currentScale = 1;
                currentTranslate = { x: 0, y: 0 };
                hasDragged = false;
                isDragging = false;
                baseSize = { w: 0, h: 0 }; // 换图后基准尺寸失效，等图片加载完重新测量

                imgContainer.style.transition = '';
                applyTransform();

                // 图片加载完成后重新测量基准尺寸，保证不同尺寸的图片拖动边界都正确
                modalImg.onload = function() {
                    measureBaseSize();
                    modalImg.onload = null;
                };
                modalImg.src = src;
                // 若命中缓存同步完成，onload 可能不触发，这里兜底再测一次
                if (modalImg.complete && modalImg.naturalWidth) {
                    measureBaseSize();
                }

                modal.style.display = 'flex';
                // 延迟一帧做淡入，实现动画
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 10);
            };

            window.closeImgModal = function() {
                closeWeChatModal();
            };

        })();

        window.recoverArchive = id => {
            const idx = archivedNotes.findIndex(n => n.id === id);
            if (idx !== -1) {
                const note = archivedNotes.splice(idx, 1)[0];
                note.done = false;
                delete note.doneTime;
                notes.push(note);
                save();
                saveArchive();
            }
        };

        window.deleteArchive = id => {
            if (confirm('确定要彻底删除该归档任务吗？不可恢复！')) {
                const idx = archivedNotes.findIndex(n => n.id === id);
                if (idx !== -1) {
                    archivedNotes.splice(idx, 1);
                    saveArchive();
                }
            }
        };

        window.clearArchiveHistory = e => {
            if (e) e.stopPropagation();
            if (confirm('确定要清空所有已归档的历史任务吗？这将彻底删除所有历史记录，不可恢复！')) {
                archivedNotes = [];
                saveArchive();
            }
        };

        // ===== 右键菜单 · 图片粘贴（微信互通）· 任务提醒 =====
        let currentEditableElement = null;
        let currentContextImage = null;

        // 轻量提示条：粘贴 / 复制 / 提醒反馈都用它，不依赖图片预览 Modal 里的 toast
        let appToastEl = null;
        function showAppToast(message) {
            if (!appToastEl) {
                appToastEl = document.createElement('div');
                appToastEl.style.cssText = 'position:fixed;left:50%;bottom:60px;transform:translateX(-50%);' +
                    'background:rgba(0,0,0,0.82);color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;' +
                    'z-index:999999;opacity:0;transition:opacity .25s;pointer-events:none;max-width:70vw;';
                document.body.appendChild(appToastEl);
            }
            appToastEl.textContent = message;
            appToastEl.style.opacity = '1';
            clearTimeout(appToastEl._t);
            appToastEl._t = setTimeout(() => { appToastEl.style.opacity = '0'; }, 2200);
        }

        /** 取元素上真正的图片地址（懒加载阶段真实地址在 data-src 上） */
        function resolveImgSrc(img) {
            if (!img) return '';
            return img.getAttribute('data-src') || img.getAttribute('src') || '';
        }

        /** 判断是不是「任务图片」：表情包 / 背景图等界面资源不参与复制 */
        function isCopyableImageSrc(src) {
            if (!src) return false;
            return /^(data:image|file:|https?:|blob:|NoteImages\/)/i.test(src) ||
                /^[a-zA-Z]:[\\/]/.test(src);
        }

        function noteIdOfEditable(el) {
            if (!el) return NaN;
            if (el.classList && el.classList.contains('table-content')) {
                const parent = el.parentElement;
                return parent ? parseInt(parent.getAttribute('data-note-id')) : NaN;
            }
            return parseInt(el.getAttribute('data-note-id'));
        }

        document.addEventListener('contextmenu', (e) => {
            const target = e.target;
            const editable = target.closest('.note-content-editable, .table-content');
            if (!editable) return;

            e.preventDefault();
            currentEditableElement = editable;
            currentContextImage = target.tagName === 'IMG' ? target : null;

            const menu = document.getElementById('contextMenu');
            const copyItem = document.getElementById('copyImageItem');
            const copyFileItem = document.getElementById('copyImageFileItem');
            if (copyItem) copyItem.style.display = currentContextImage ? 'block' : 'none';
            if (copyFileItem) copyFileItem.style.display = currentContextImage ? 'block' : 'none';
            // 卡片上随便右键都能「推送到表格」，不必非要点在图片上
            const pushItem = document.getElementById('pushWebhookItem');
            if (pushItem) pushItem.style.display = 'block';
            const projectItem = document.getElementById('setProjectItem');
            if (projectItem) projectItem.style.display = 'block';

            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            menu.classList.add('show');
        });

        document.addEventListener('click', () => {
            document.getElementById('contextMenu').classList.remove('show');
        });

        /** 把一张图片写进系统剪贴板（mode: bitmap 位图 / file 文件，微信两种都能粘） */
        async function copyImageToSystemClipboard(src, mode) {
            if (typeof require === 'undefined') {
                showAppToast('当前环境不支持复制到系统剪贴板');
                return;
            }
            try {
                const { ipcRenderer } = require('electron');
                let target = src;
                if (!/^data:image/.test(src)) {
                    if (/^https?:/i.test(src)) {
                        target = await ipcRenderer.invoke('save-note-image-source', { url: src });
                    } else if (/^file:|^[a-zA-Z]:[\\/]/.test(src)) {
                        target = await ipcRenderer.invoke('save-note-image-source', { path: src });
                    }
                }
                const res = await ipcRenderer.invoke('clipboard:write-image', target, mode || 'bitmap');
                if (res && res.ok) {
                    showAppToast(mode === 'file' ? '已复制为图片文件，可粘贴到微信' : '已复制图片，可粘贴到微信');
                } else {
                    showAppToast('复制失败：' + ((res && res.error) || '未知错误'));
                }
            } catch (err) {
                console.error('复制图片失败:', err);
                showAppToast('复制失败：' + err.message);
            }
        }

        /** 从系统剪贴板读图（微信 / 截图工具复制的位图也能读出来）并存成本地文件 */
        async function readClipboardImageFileUrl() {
            if (typeof require === 'undefined') return null;
            const { ipcRenderer } = require('electron');
            const res = await ipcRenderer.invoke('clipboard:read-image');
            if (!res || !res.ok || !res.dataUrl) return null;
            return await ipcRenderer.invoke('save-note-image', res.dataUrl);
        }

        /** 任意图片/视频地址 → 本库文件 URL（file:// 会先入库，避免原文件被清理后裂图） */
        async function localizeImageSrc(src) {
            if (!src) return null;
            // 【2026-11-06】内联媒体不只有图片：data:video/mp4、data:audio/... 同样要落盘，
            // 否则 base64 视频会把笔记撑成几 MB 的字符串。
            if (/^data:(image|video|audio)\//i.test(src)) {
                if (typeof require === 'undefined') return src;
                try {
                    const { ipcRenderer } = require('electron');
                    return await ipcRenderer.invoke('save-note-image', src);
                } catch (e) {
                    return src;
                }
            }
            if (/^https?:/i.test(src) || /^file:/i.test(src)) {
                if (typeof require === 'undefined') return src;
                try {
                    const { ipcRenderer } = require('electron');
                    return await ipcRenderer.invoke('save-note-image-source',
                        /^https?:/i.test(src) ? { url: src } : { path: src });
                } catch (e) {
                    console.warn('图片本地化失败，保留原地址:', e.message);
                    return src;
                }
            }
            return src;
        }

        function insertImageIntoEditable(editable, fileUrl) {
            const img = document.createElement('img');
            img.src = fileUrl;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '8px';
            img.style.margin = '4px 0';

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (editable.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    range.insertNode(img);
                    range.setStartAfter(img);
                    range.setEndAfter(img);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return img;
                }
            }
            editable.appendChild(img);
            return img;
        }

        function persistEditable(editable) {
            if (!editable) return;
            if (editable.classList && editable.classList.contains('table-content')) {
                const noteId = noteIdOfEditable(editable);
                const n = notes.find(x => x.id === noteId);
                if (n) {
                    n.content = serializeEditable(editable);
                    save();
                }
            } else {
                updateNoteContent(editable);
            }
        }

        function fileToDataUrl(file) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }

        /**
         * 【2026-11-06】内联 <svg>（从网页 / 设计工具复制的矢量图）→ dataURL。
         * 用 img 承载，既能入库又能保持矢量清晰；img 上下文不执行 SVG 里的脚本。
         */
        function svgToDataUrl(svgEl) {
            try {
                const text = new XMLSerializer().serializeToString(svgEl);
                if (!text || text.indexOf('<svg') === -1) return '';
                return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
            } catch (e) {
                return '';
            }
        }

        function isVideoSrc(src) {
            const s = String(src || '');
            return /^data:video\//i.test(s) || /\.(mp4|webm|mov|m4v|ogv|ogg|mkv|avi)(?:[?#]|$)/i.test(s);
        }

        function parseHtmlBody(html) {
            if (!html) return null;
            try {
                return new DOMParser().parseFromString(html, 'text/html').body;
            } catch (e) {
                return null;
            }
        }

        function extractImgSrcs(html) {
            const out = [];
            const body = parseHtmlBody(html);
            if (!body) return out;
            body.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('data-src') || img.getAttribute('src');
                if (src && !isLazyPlaceholder(src) && out.indexOf(src) === -1) out.push(src);
            });
            body.querySelectorAll('svg').forEach(svg => {
                const src = svgToDataUrl(svg);
                if (src && out.indexOf(src) === -1) out.push(src);
            });
            return out;
        }

        /** 剪贴板 HTML 里的 <video src> / <source src> */
        function extractVideoSrcs(html) {
            const out = [];
            const body = parseHtmlBody(html);
            if (!body) return out;
            body.querySelectorAll('video').forEach(v => {
                let src = v.getAttribute('src') || '';
                if (!src) {
                    const source = v.querySelector('source[src]');
                    if (source) src = source.getAttribute('src');
                }
                if (src && out.indexOf(src) === -1) out.push(src);
            });
            return out;
        }

        /**
         * 把剪贴板里的「文件」收进媒体库。
         * Electron 的 File 对象带真实路径，直接让主进程 copy，避免几十 MB 视频在渲染进程里转 base64。
         */
        async function localizeMediaFile(file) {
            if (!file) return null;
            if (typeof require !== 'undefined' && file.path) {
                try {
                    const { ipcRenderer } = require('electron');
                    const url = await ipcRenderer.invoke('save-note-image-source', { path: file.path });
                    if (url) return url;
                } catch (e) {
                    // 复制失败再退回 dataURL 路径
                }
            }
            const dataUrl = await fileToDataUrl(file);
            return dataUrl ? await localizeImageSrc(dataUrl) : null;
        }

        /** 统一的「往某个可编辑区粘贴一张图」主流程 */
        async function pasteImageIntoEditable(editable) {
            if (!editable) return false;
            const fileUrl = await readClipboardImageFileUrl();
            if (!fileUrl) return false;
            insertImageIntoEditable(editable, fileUrl);
            persistEditable(editable);
            return true;
        }

        document.getElementById('pasteImageItem').onclick = async () => {
            const editable = currentEditableElement;
            document.getElementById('contextMenu').classList.remove('show');
            if (!editable) return;
            const ok = await pasteImageIntoEditable(editable);
            if (!ok) showAppToast('剪贴板里没有图片');
            currentEditableElement = null;
        };

        document.getElementById('copyImageItem').onclick = () => {
            const img = currentContextImage;
            document.getElementById('contextMenu').classList.remove('show');
            if (!img) return;
            copyImageToSystemClipboard(resolveImgSrc(img), 'bitmap');
        };

        document.getElementById('copyImageFileItem').onclick = () => {
            const img = currentContextImage;
            document.getElementById('contextMenu').classList.remove('show');
            if (!img) return;
            copyImageToSystemClipboard(resolveImgSrc(img), 'file');
        };

        // 把这条任务推送到外部表格（WebHook）
        document.getElementById('pushWebhookItem').onclick = () => {
            const editable = currentEditableElement;
            document.getElementById('contextMenu').classList.remove('show');
            if (!editable) return;
            const noteId = noteIdOfEditable(editable);
            const note = notes.find(x => x.id === noteId) || archivedNotes.find(x => x.id === noteId);
            if (!note) return;
            if (typeof require === 'undefined') {
                showAppToast('当前环境不支持 WebHook 推送');
                return;
            }
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('webhook:push', {
                action: note.done ? 'completed' : 'created',
                tasks: [note]
            }).then(() => showAppToast('已推送到表格'));
        };

        // 右键 →「归入项目…」
        document.getElementById('setProjectItem').onclick = () => {
            const editable = currentEditableElement;
            document.getElementById('contextMenu').classList.remove('show');
            if (!editable) return;
            const noteId = noteIdOfEditable(editable);
            const note = notes.find(x => x.id === noteId) || archivedNotes.find(x => x.id === noteId);
            if (note) window.setNoteProject(note.id);
        };

        // 给任务设置提醒时间（M14-3）
        document.getElementById('remindTaskItem').onclick = () => {
            const editable = currentEditableElement;
            document.getElementById('contextMenu').classList.remove('show');
            if (!editable) return;
            const noteId = noteIdOfEditable(editable);
            const note = notes.find(x => x.id === noteId) || archivedNotes.find(x => x.id === noteId);
            if (!note) return;
            openReminderPicker(note.remindAt).then(result => {
                if (result === null) return; // 取消
                if (result === '') {
                    delete note.remindAt;
                    showAppToast('已清除提醒');
                } else {
                    note.remindAt = result;
                    showAppToast('已设置提醒：' + formatDate(result));
                }
                if (archivedNotes.indexOf(note) !== -1) saveArchive();
                else save();
            });
        };

        /** 提醒时间选择弹窗（M14-3 改版）：原生日历选择 + 一键快捷预设，取代手输 prompt
         *  返回 Promise：null = 取消；'' = 清除提醒；数字 = 所选时间戳 */
        function openReminderPicker(currentTs) {
            return new Promise(resolve => {
                const old = document.getElementById('reminderPickerOverlay');
                if (old) old.remove();
                const pad = n => String(n).padStart(2, '0');
                const toLocalValue = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
                const presetTime = (dayOffset, h, m) => { const d = new Date(); d.setDate(d.getDate() + (dayOffset || 0)); d.setHours(h, m, 0, 0); return d.getTime() > Date.now() ? d.getTime() : d.getTime() + 86400000; };
                const presets = [
                    ['30分钟后', Date.now() + 30 * 60 * 1000],
                    ['1小时后', Date.now() + 3600 * 1000],
                    ['2小时后', Date.now() + 2 * 3600 * 1000],
                    ['今晚 22:00', presetTime(0, 22, 0)],
                    ['明天 09:00', presetTime(1, 9, 0)],
                    ['明晚 18:00', presetTime(1, 18, 0)]
                ];

                const overlay = document.createElement('div');
                overlay.id = 'reminderPickerOverlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;';
                const box = document.createElement('div');
                box.style.cssText = 'background:#1e1e2e;color:#eee;border:1px solid #444;border-radius:12px;padding:20px 22px;width:min(92vw,340px);box-shadow:0 12px 40px rgba(0,0,0,0.5);';
                box.innerHTML =
                    '<div style="font-size:15px;font-weight:bold;margin-bottom:14px;">⏰ 设置提醒时间</div>' +
                    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;" id="rpPresets"></div>' +
                    '<input type="datetime-local" id="rpInput" style="width:100%;box-sizing:border-box;padding:9px 10px;background:#222;border:1px solid #555;border-radius:8px;color:#fff;font-size:14px;">' +
                    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;align-items:center;">' +
                    '<button id="rpClear" style="margin-right:auto;padding:8px 14px;background:transparent;border:1px solid #a55;color:#e88;border-radius:8px;cursor:pointer;font-size:13px;">清除提醒</button>' +
                    '<button id="rpOk" style="padding:8px 20px;background:#7e57c2;border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:13px;">确定</button>' +
                    '<button id="rpCancel" style="padding:8px 16px;background:rgba(255,255,255,0.1);border:none;color:#ccc;border-radius:8px;cursor:pointer;font-size:13px;">取消</button>' +
                    '</div>';
                overlay.appendChild(box);
                document.body.appendChild(overlay);

                const input = box.querySelector('#rpInput');
                if (currentTs) input.value = toLocalValue(currentTs);
                input.style.colorScheme = 'dark';

                let done = false;
                const finish = v => { if (done) return; done = true; overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
                const onKey = e => {
                    if (e.key === 'Escape') finish(null);
                    else if (e.key === 'Enter') finish(input.value ? new Date(input.value).getTime() : '');
                };
                document.addEventListener('keydown', onKey);
                overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });

                const presetBox = box.querySelector('#rpPresets');
                presets.forEach(([label, ts]) => {
                    const b = document.createElement('button');
                    b.textContent = label;
                    b.style.cssText = 'padding:8px 4px;background:rgba(126,87,194,0.16);border:1px solid rgba(126,87,194,0.45);color:#c5b3e6;border-radius:8px;cursor:pointer;font-size:12px;';
                    b.onclick = () => finish(ts);
                    presetBox.appendChild(b);
                });
                box.querySelector('#rpOk').onclick = () => {
                    if (!input.value) return finish('');
                    const ts = new Date(input.value).getTime();
                    finish(isNaN(ts) ? null : ts);
                };
                box.querySelector('#rpClear').onclick = () => finish('');
                box.querySelector('#rpCancel').onclick = () => finish(null);
                setTimeout(() => input.focus(), 50);
            });
        }

        function formatDateInput(ts) {
            const d = new Date(ts);
            const p = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
        }

        function handleNoteBlur(editable) {
            updateNoteContent(editable);
        }
        
        function handleNoteKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            }
        }

        /**
         * 把剪贴板里的「文字 + 图片」一起插入，而不是二选一。
         * 【2026-10-20】企业微信复制一条图文消息时，text/html 里同时有文字和 <img>；
         * 旧逻辑一检测到图片就 preventDefault 并且只插图片，文字被整段吞掉。
         */
        function insertClipboardContent(editable, text, imageUrls) {
            if (!editable || editable.isConnected === false) return;
            const sel = window.getSelection();
            let range = null;
            if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0);
                if (editable.contains(r.commonAncestorContainer)) range = r;
            }
            if (!range) {
                range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
            }
            range.deleteContents();

            const frag = document.createDocumentFragment();
            const textVal = String(text || '');
            if (textVal) {
                textVal.split(/\r?\n/).forEach((line, idx) => {
                    if (idx > 0) frag.appendChild(document.createElement('br'));
                    if (line) frag.appendChild(document.createTextNode(line));
                });
            }
            const urls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
            if (urls.length) {
                if (textVal) frag.appendChild(document.createElement('br'));
                urls.forEach((url, i) => {
                    if (i > 0) frag.appendChild(document.createElement('br'));
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.objectFit = 'contain';
                    img.style.borderRadius = '8px';
                    img.style.margin = '4px 0';
                    frag.appendChild(img);
                });
            }
            if (!frag.childNodes.length) return;
            const last = frag.lastChild;
            range.insertNode(frag);
            if (last && last.parentNode) {
                const after = document.createRange();
                after.setStartAfter(last);
                after.collapse(true);
                sel.removeAllRanges();
                sel.addRange(after);
            }
            // 表格视图的单元格等失焦时再落盘：这里立刻保存会触发整行重绘，光标会被打断
            if (editable.classList && editable.classList.contains('table-content')) return;
            persistEditable(editable);
        }

        // ---- 图文混排剪贴板（2026-11-06）----
        /**
         * 把剪贴板 HTML 拆成「按原始顺序」的图文块。
         * 旧逻辑是「所有文字一次性插入 + 所有图片追加到末尾」，图文混排（文字-图片-文字-图片）
         * 粘进来就变成「文字全在顶部、图片全堆在底部」。这里按 DOM 文档顺序产出：
         *   { type: 'text', text } / { type: 'image', src } / { type: 'break' }
         * 用 DOMParser 解析（inert document，不执行脚本、不加载图片），再逐层遍历。
         */
        function parseRichClipboardItems(html) {
            const items = [];
            if (!html) return items;

            let holder;
            try {
                holder = new DOMParser().parseFromString(html, 'text/html').body;
            } catch (e) {
                return items;
            }
            if (!holder) return items;
            holder.querySelectorAll('script,style,noscript,template').forEach(n => n.remove());

            let buf = '';
            const clean = (s) => String(s || '')
                .replace(/\u00a0/g, ' ')
                .replace(/[ \t]+/g, ' ')
                .split('\n').map(line => line.trim()).join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            const pushBreak = () => {
                if (!items.length) return;
                if (items[items.length - 1].type !== 'break') items.push({ type: 'break' });
            };
            const flush = (withBreak) => {
                const text = clean(buf);
                buf = '';
                if (text) items.push({ type: 'text', text: text });
                if (withBreak && (text || (items.length && items[items.length - 1].type === 'image'))) {
                    pushBreak();
                }
            };

            const BLOCK = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|SECTION|ARTICLE|PRE|TR|FIGURE|FIGCAPTION)$/;
            const walk = (node) => {
                Array.from(node.childNodes).forEach(child => {
                    if (child.nodeType === 3) {
                        buf += child.nodeValue;
                        return;
                    }
                    if (child.nodeType !== 1) return;
                    // 【2026-11-06】HTML 文档里内联 <svg> 的 tagName 是 'svg'（小写，非 HTML 命名空间），
                    // 旧代码只比对 'SVG' 会漏掉它，导致内联图标被当成普通块元素、文本被并进段落。
                    // 统一归一化成大写再比对，HTML 元素与 SVG 元素共用同一套分支。
                    const tag = String(child.tagName || '').toUpperCase();
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return;
                    if (tag === 'BR') {
                        buf += '\n';
                        return;
                    }
                    if (tag === 'IMG') {
                        flush(false);
                        const src = child.getAttribute('data-src') || child.getAttribute('src') || '';
                        if (src && !isLazyPlaceholder(src)) items.push({ type: 'image', src: src });
                        return;
                    }
                    if (tag === 'SVG') {
                        flush(false);
                        const src = svgToDataUrl(child);
                        if (src) items.push({ type: 'image', src: src });
                        return;
                    }
                    if (tag === 'VIDEO') {
                        flush(false);
                        let src = child.getAttribute('src') || '';
                        if (!src) {
                            const source = child.querySelector('source[src]');
                            if (source) src = source.getAttribute('src');
                        }
                        if (src) items.push({ type: 'video', src: src });
                        return;
                    }
                    if (tag === 'TABLE') {
                        // 数据表已走表格分支；这里遇到的是图文里夹带的小表格，退化成文字别丢内容
                        flush(false);
                        const text = clean(child.textContent || '');
                        if (text) {
                            items.push({ type: 'text', text: text });
                            pushBreak();
                        }
                        return;
                    }
                    const isBlock = BLOCK.test(tag);
                    if (isBlock) flush(false);
                    walk(child);
                    if (isBlock) flush(true);
                });
            };
            walk(holder);
            flush(false);
            while (items.length && items[items.length - 1].type === 'break') items.pop();
            return items;
        }

        /**
         * 按原始顺序插入「文字 + 图片」。
         * 图片仍逐张本地化（网络图会入库，离线也能看）；HTML 里的地址取不到时，
         * 用剪贴板同时提供的图片文件补位。返回图片张数；失败返回 false。
         */
        async function insertRichClipboardContent(editable, items, fallbackFiles) {
            if (!editable || editable.isConnected === false) return false;
            const sel = window.getSelection();
            let range = null;
            if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0);
                if (editable.contains(r.commonAncestorContainer)) range = r;
            }
            if (!range) {
                range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
            }
            range.deleteContents();

            const frag = document.createDocumentFragment();
            const appendBreak = () => {
                if (frag.lastChild && frag.lastChild.tagName === 'BR') return;
                frag.appendChild(document.createElement('br'));
            };
            const srcCache = new Map();
            const files = Array.isArray(fallbackFiles) ? fallbackFiles.slice() : [];
            let fileCursor = 0;
            let mediaCount = 0;   // 图片 + 视频

            for (const item of items) {
                if (item.type === 'break') {
                    appendBreak();
                    continue;
                }
                if (item.type === 'text') {
                    item.text.split('\n').forEach((line, i) => {
                        if (i > 0) frag.appendChild(document.createElement('br'));
                        if (line) frag.appendChild(document.createTextNode(line));
                    });
                    continue;
                }
                if (item.type !== 'image' && item.type !== 'video') continue;

                let url = srcCache.has(item.src) ? srcCache.get(item.src) : null;
                if (!srcCache.has(item.src)) {
                    url = item.alreadyLocal ? item.src : await localizeImageSrc(item.src);
                    if (!url && files.length) {
                        const file = files[fileCursor++];
                        if (file) {
                            const dataUrl = await fileToDataUrl(file);
                            if (dataUrl) url = await localizeImageSrc(dataUrl);
                        }
                    }
                    srcCache.set(item.src, url || null);
                }
                if (!url) continue;

                // 【2026-11-06】视频：落成原生 <video controls>，本地 file:// 播放，离线也能看
                if (item.type === 'video') {
                    const video = document.createElement('video');
                    video.src = url;
                    video.controls = true;
                    video.preload = 'metadata';
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '320px';
                    video.style.borderRadius = '8px';
                    video.style.margin = '4px 0';
                    video.style.background = '#000';
                    frag.appendChild(video);
                    mediaCount++;
                    appendBreak();
                    continue;
                }

                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '200px';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '8px';
                img.style.margin = '4px 0';
                frag.appendChild(img);
                mediaCount++;
                appendBreak();
            }

            while (frag.lastChild && frag.lastChild.tagName === 'BR') frag.removeChild(frag.lastChild);
            if (!frag.childNodes.length) return false;
            const last = frag.lastChild;
            range.insertNode(frag);
            if (last && last.parentNode && sel) {
                const after = document.createRange();
                after.setStartAfter(last);
                after.collapse(true);
                sel.removeAllRanges();
                sel.addRange(after);
            }
            if (editable.id === 'noteInput') updateInputPlaceholder(editable);
            if (editable.classList && editable.classList.contains('table-content')) return mediaCount;
            persistEditable(editable);
            return mediaCount;
        }
        // ---- /图文混排剪贴板 ----

        /** HTML 兜底转纯文本（部分软件只给 HTML，不给 text/plain） */
        function htmlToPlainText(html) {
            if (!html) return '';
            const div = document.createElement('div');
            div.innerHTML = html;
            div.querySelectorAll('script,style').forEach(n => n.remove());
            div.querySelectorAll('img').forEach(n => n.remove());
            return (div.innerText || div.textContent || '').replace(/\u00a0/g, ' ').trim();
        }

        /**
         * 【2026-11-06】取剪贴板表格解析模块。
         * 窗口开了 nodeIntegration:true，`<script>` 里的 UMD 会走 CommonJS 分支，
         * window.ClipboardTable 可能不存在 —— 这里再用 require 兜一层，保证两条路都通。
         */
        function getClipboardTable() {
            if (window.ClipboardTable) return window.ClipboardTable;
            if (typeof require === 'function') {
                try { return require('./clipboard-table.js'); } catch (e) { /* ignore */ }
            }
            return null;
        }

        /**
         * 【2026-11-05】从主进程直读系统剪贴板的 HTML（CF_HTML）。
         * 腾讯文档这类网页应用复制时，paste 事件的 clipboardData 偶尔拿不到 text/html，
         * 但系统剪贴板里其实是有富文本的；网页版没有 Electron，直接返回空字符串。
         */
        async function readClipboardHtmlFromSystem() {
            if (window.__timerWebBridge || typeof require === 'undefined') return '';
            try {
                const ipcRenderer = require('electron').ipcRenderer;
                const res = await ipcRenderer.invoke('clipboard:read-html');
                return (res && res.ok && typeof res.html === 'string') ? res.html : '';
            } catch (err) {
                return '';
            }
        }

        /**
         * 【2026-11-05】把解析好的表格插进任务内容（卡片 / 新建输入框 / 表格视图单元格）。
         * 生成的是真正的 <table>：单元格可直接点进去改，复制出去到 Word / 腾讯文档也还是表格。
         * 优先用 insertHTML 保留浏览器撤销栈；失败时退回 Range 插入，保证内容一定落地。
         */
        function insertTableIntoEditable(editable, tableData) {
            const TableLib = getClipboardTable();
            if (!editable || editable.isConnected === false || !TableLib) return false;
            const html = TableLib.rowsToTableHtml(tableData) + '<br>';
            const sel = window.getSelection();
            editable.focus();
            let range = null;
            if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0);
                if (editable.contains(r.commonAncestorContainer)) range = r;
            }
            if (!range) {
                range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
                if (sel) { sel.removeAllRanges(); sel.addRange(range); }
            }

            let ok = false;
            try {
                ok = document.execCommand('insertHTML', false, html);
            } catch (err) { ok = false; }
            if (!ok) {
                range.deleteContents();
                const tpl = document.createElement('template');
                tpl.innerHTML = html;
                const frag = tpl.content;
                const last = frag.lastChild;
                range.insertNode(frag);
                if (last && last.parentNode && sel) {
                    const after = document.createRange();
                    after.setStartAfter(last);
                    after.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(after);
                }
            }

            // noteInput 靠点「添加」时读 innerHTML；表格视图单元格等失焦时再落盘，避免整行重绘打断光标
            const isTableContent = editable.classList && editable.classList.contains('table-content');
            if (editable.id !== 'noteInput' && !isTableContent) persistEditable(editable);
            if (editable.id === 'noteInput') updateInputPlaceholder(editable);
            showAppToast('已粘贴 ' + tableData.rowCount + ' 行 × ' + tableData.cols + ' 列表格');
            return true;
        }

        /** RTF 转义：中文用 \uN? 形式，保证 Word / WPS / 企业微信富文本框能识别 */
        function escapeRtfText(text) {
            return String(text || '')
                .replace(/\\/g, '\\\\')
                .replace(/{/g, '\\{')
                .replace(/}/g, '\\}')
                .replace(/\r\n|\r|\n/g, '\\par\n')
                .replace(/[^\x00-\x7f]/g, ch => '\\u' + ch.charCodeAt(0) + '?');
        }

        function base64ToHex(b64) {
            const bin = atob(b64);
            const out = new Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                out[i] = ('0' + bin.charCodeAt(i).toString(16)).slice(-2);
            }
            return out.join('');
        }

        /**
         * 构造带图片的 RTF。图片以 PNG 内嵌（\pngblip），
         * 这样「全选复制」粘到 Word / WPS / 邮件 / 企业微信富文本时文字和图片都在。
         * 图片过大的（合计 > 4MB）跳过 RTF 图片，避免剪贴板爆炸；HTML 里仍有图。
         */
        function buildRtf(text, images) {
            const parts = ['{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fnil\\fcharset134 Microsoft YaHei;}}\\viewkind4\\uc1\\pard\\f0\\fs20 '];
            if (text) parts.push(escapeRtfText(text));
            let used = 0;
            (images || []).forEach(im => {
                if (!im || !im.dataUrl || im.dataUrl.indexOf('data:image/png') !== 0) return;
                const b64 = im.dataUrl.slice(im.dataUrl.indexOf(',') + 1);
                used += b64.length;
                if (used > 4 * 1024 * 1024) return;
                const w = im.size && im.size.width ? im.size.width : 0;
                const h = im.size && im.size.height ? im.size.height : 0;
                const dim = (w && h) ? '\\picw' + w + '\\pich' + h + '\\picwgoal' + (w * 15) + '\\pichgoal' + (h * 15) : '';
                parts.push('\\par{\\pict\\pngblip' + dim + ' ' + base64ToHex(b64) + '}\\par');
            });
            parts.push('}');
            return parts.join('');
        }

        /**
         * 粘贴事件：腾讯文档 / 企业微信 / 截图工具 / 文件管理器 / 网页 统一处理
         *   ⓪ 表格（text/html 里的 <table> 或 TSV 文本）—— 转成可编辑表格，优先
         *   ① 剪贴板带图片文件 / HTML 里夹带的图片，连同文字一起保留
         *   ② 只有位图（微信 / 企业微信 / Win+Shift+S），主进程直接读系统剪贴板
         *   ③ 富文本兜底：text/plain 为空时用 HTML 取字，必要时让主进程直读系统剪贴板
         *   ④ 纯文本
         */
        document.addEventListener('paste', (e) => {
            const target = e.target;
            const editable = target.closest && target.closest('.note-content-editable, .table-content, .note-input');
            if (!editable) return;

            const cd = e.clipboardData;
            if (!cd) return;

            // 【2026-10-22 修复「一粘贴就出现两份」】
            // 旧逻辑只在「剪贴板自带图片文件 / HTML 带图」这一条分支里同步 preventDefault；
            // 走「系统剪贴板位图」分支时要先 await 主进程读图，等结果回来再 preventDefault 已经晚了——
            // 浏览器早就把默认内容（文字 + 位图）原生粘进去了，我们再插一遍，于是文字和图片都成双份。
            // 现在：事件里先同步把要用的数据全部取出来并拦下默认粘贴，再异步地自己插一次。
            const plain = cd.getData('text/plain') || '';
            const html = cd.getData('text/html') || '';
            const items = Array.from(cd.items || []);
            const fileImgs = Array.from(cd.files || []).filter(f => f.type && f.type.startsWith('image/'));
            // 【2026-11-06】视频文件：资源管理器复制 mp4 / 网页视频，和图片一样收进媒体库
            const fileVideos = Array.from(cd.files || []).filter(f => f.type && /^video\//i.test(f.type));
            const htmlSrcs = extractImgSrcs(html);
            const htmlVideoSrcs = extractVideoSrcs(html);
            // 【2026-11-05】腾讯文档 / 在线表格的表格数据在 text/html 或 TSV 里，
            // 必须在同步阶段（preventDefault 之前）解析好，异步分支才能直接用。
            const ClipboardTable = getClipboardTable();
            const tableData = ClipboardTable ? ClipboardTable.extract(html, plain) : null;
            e.preventDefault();

            (async () => {
                const stillThere = () => editable.isConnected !== false;

                // ⓪ 表格粘贴：旧逻辑只认图片和纯文本，HTML 里的 <table> 被整段丢掉、
                //    text/plain 只有 TSV 时也只粘成一堆挤在一起的字符。这里转成真表格。
                if (tableData && stillThere()) {
                    insertTableIntoEditable(editable, tableData);
                    return;
                }

                // ① 剪贴板里直接带图片 / 视频文件，或 HTML 里带图 / 视频（截图工具、资源管理器、网页、企业微信图文）
                if (fileImgs.length || htmlSrcs.length || fileVideos.length || htmlVideoSrcs.length) {
                    // ①-A 【2026-11-06】图文 / 视频混排：按 HTML 里的原始顺序逐段插入（文字 → 图片 → 视频 → 文字 …）。
                    //      旧逻辑把文字一次性插完、再追加所有媒体，混排顺序就全乱了。
                    if (htmlSrcs.length || htmlVideoSrcs.length) {
                        const richItems = parseRichClipboardItems(html);
                        if (richItems.some(it => it.type === 'image' || it.type === 'video') && stillThere()) {
                            const inserted = await insertRichClipboardContent(editable, richItems, fileImgs);
                            if (inserted !== false) {
                                showAppToast(inserted > 0
                                    ? '已粘贴文字和 ' + inserted + ' 个媒体'
                                    : '已粘贴文字');
                                return;
                            }
                        }
                    }

                    // ①-B 【2026-11-06】纯视频文件（资源管理器 / 网页下载的视频）：入库后逐个插入
                    if (fileVideos.length) {
                        const videoUrls = [];
                        for (const file of fileVideos) {
                            const url = await localizeMediaFile(file);
                            if (url && videoUrls.indexOf(url) === -1) videoUrls.push(url);
                        }
                        if (videoUrls.length && stillThere()) {
                            const items = [];
                            const text = plain.trim() ? plain : htmlToPlainText(html);
                            if (text) items.push({ type: 'text', text: text });
                            videoUrls.forEach(url => items.push({ type: 'video', src: url, alreadyLocal: true }));
                            const inserted = await insertRichClipboardContent(editable, items, []);
                            if (inserted !== false) {
                                showAppToast((text ? '已粘贴文字和 ' : '已粘贴 ') + videoUrls.length + ' 个视频');
                                return;
                            }
                        }
                    }

                    // ①-B 没有 HTML 结构（纯图片文件 / 剪贴板只给位图）：沿用「文字 + 图片」
                    const urls = [];
                    for (const file of fileImgs) {
                        const dataUrl = await fileToDataUrl(file);
                        if (!dataUrl) continue;
                        const fileUrl = await localizeImageSrc(dataUrl);
                        if (fileUrl && urls.indexOf(fileUrl) === -1) urls.push(fileUrl);
                    }
                    // 同一张图常常同时出现在 files 和 HTML 里：优先用 files，避免一张图粘成两张
                    if (!fileImgs.length) {
                        for (const src of htmlSrcs) {
                            const fileUrl = await localizeImageSrc(src);
                            if (fileUrl && urls.indexOf(fileUrl) === -1) urls.push(fileUrl);
                        }
                    }
                    // 纯文件粘贴时 text/plain 往往只是文件名，不往任务里塞；
                    // 但企业微信「文字 + 图片文件」的剪贴板也可能走 files，这时文字必须保留。
                    let textToInsert = '';
                    if (htmlSrcs.length) {
                        textToInsert = plain.trim() ? plain : htmlToPlainText(html);
                    } else if (fileImgs.length && plain.trim()) {
                        const names = fileImgs.map(f => f.name).filter(Boolean);
                        const plainTrim = plain.trim();
                        const isJustFileName = names.some(n => plainTrim === n) ||
                            plainTrim.split(/\r?\n/).every(line => names.indexOf(line.trim()) !== -1);
                        if (!isJustFileName) textToInsert = plain;
                    }
                    if ((urls.length || textToInsert) && stillThere()) {
                        insertClipboardContent(editable, textToInsert, urls);
                        if (urls.length) showAppToast(textToInsert.trim() ? '已粘贴文字和图片' : '图片已粘贴');
                        return;
                    }
                }

                // ② 只有位图（微信 / 企业微信截图）：主进程直接读系统剪贴板
                // 注意：③ 的兜底不能提到这里前面，否则粘贴截图时会先去读 HTML 而多一次 IPC
                // 网页版 navigator.clipboard.read() 会弹权限框，只在剪贴板确实带图片条目时才尝试
                const hasImageItem = items.some(it => it.type && it.type.startsWith('image/'));
                const mayReadBitmap = !window.__timerWebBridge || hasImageItem;
                if (mayReadBitmap) {
                    const bitUrl = await readClipboardImageFileUrl();
                    if (bitUrl && stillThere()) {
                        insertClipboardContent(editable, plain, [bitUrl]);
                        showAppToast(plain.trim() ? '已粘贴文字和图片' : '图片已粘贴');
                        return;
                    }
                }

                // ③ 富文本兜底：有些来源（腾讯文档 / 网页）只给 text/html、不给 text/plain，
                //    旧逻辑在这里直接 return，粘贴后什么都没有；paste 事件连 HTML 都拿不到时，
                //    再让主进程读一次系统剪贴板的 CF_HTML。
                let textToPaste = plain;
                if (!String(textToPaste).trim() && html) textToPaste = htmlToPlainText(html);
                if (!String(textToPaste).trim() && !fileImgs.length) {
                    const sysHtml = await readClipboardHtmlFromSystem();
                    if (sysHtml) {
                        const sysTable = ClipboardTable ? ClipboardTable.extract(sysHtml, '') : null;
                        if (sysTable && stillThere()) {
                            insertTableIntoEditable(editable, sysTable);
                            return;
                        }
                        textToPaste = htmlToPlainText(sysHtml);
                    }
                }

                // ④ 纯文本：一律按纯文本粘，避免把外部样式带进任务里
                if (!String(textToPaste).trim() || !stillThere()) return;
                if (editable.id === 'noteInput') {
                    document.execCommand('insertText', false, textToPaste);
                } else {
                    insertClipboardContent(editable, textToPaste, []);
                }
            })();
        });

        /**
         * Ctrl+C：选区里有图片时，把「文字 + 图片」一起写进系统剪贴板。
         * 【2026-10-20】旧逻辑只有「选中的全是图片」才处理，一旦带文字就交回默认复制，
         * 而默认 HTML 里的 <img src="file://…"> 企业微信 / Word 根本读不到 —— 看起来就是「图没了」。
         * 现在图片全部转成 data URL 内嵌到 HTML（Word/WPS/网页可用），并附带 RTF；
         * 纯图片选区仍额外写位图，方便直接粘进企业微信聊天框。
         */
        document.addEventListener('copy', async (e) => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

            let frag = null;
            try {
                frag = sel.getRangeAt(0).cloneContents();
            } catch (err) {
                return;
            }
            if (!frag || !frag.querySelectorAll) return;

            const imgs = Array.from(frag.querySelectorAll('img')).filter(img => !img.classList.contains('emoji'));
            if (imgs.length === 0) return; // 没有图片就走浏览器默认复制

            const srcs = [];
            imgs.forEach(img => {
                const src = resolveImgSrc(img);
                if (src && isCopyableImageSrc(src) && !isLazyPlaceholder(src) && srcs.indexOf(src) === -1) srcs.push(src);
            });
            if (srcs.length === 0) return;

            // 必须在第一个 await 之前阻止默认行为，否则浏览器已经写入默认剪贴板
            e.preventDefault();

            if (typeof require === 'undefined') return;
            let ipcRenderer;
            try {
                ipcRenderer = require('electron').ipcRenderer;
            } catch (err) {
                return;
            }

            const images = [];
            for (const src of srcs) {
                try {
                    const res = await ipcRenderer.invoke('image:to-data-url', src);
                    if (res && res.ok && res.dataUrl) images.push(res);
                } catch (err) {
                    console.warn('[copy] 图片读取失败：', src, err && err.message);
                }
            }
            if (images.length === 0) {
                // 图片全失败时至少把文字写出去，别让这次复制完全丢失
                try {
                    await ipcRenderer.invoke('clipboard:write-rich', { text: sel.toString() });
                } catch (err) { /* ignore */ }
                showAppToast('图片读取失败，已复制文字');
                return;
            }

            const text = sel.toString();
            const htmlParts = [];
            if (text) htmlParts.push(escapeHtml(text).replace(/\n/g, '<br>'));
            images.forEach(im => {
                htmlParts.push('<div><img src="' + im.dataUrl + '" style="max-width:100%;"></div>');
            });
            const payload = {
                text: text,
                html: '<meta charset="utf-8"><div>' + htmlParts.join('') + '</div>'
            };
            if (text.trim()) {
                // 有文字时不写位图：聊天工具会优先取位图，文字反而会被吞掉
                try {
                    payload.rtf = buildRtf(text, images);
                } catch (err) { /* RTF 失败不影响 HTML */ }
            } else {
                // 纯图片：位图是最通用的，企业微信聊天框可直接粘贴
                payload.imageDataUrl = images[0].dataUrl;
            }

            try {
                const res = await ipcRenderer.invoke('clipboard:write-rich', payload);
                if (res && res.ok) {
                    showAppToast(text.trim()
                        ? '已复制文字和图片（可粘贴到 Word / 企业微信）'
                        : (images.length > 1 ? '已复制 ' + images.length + ' 张图片' : '已复制图片'));
                } else {
                    showAppToast('复制失败：' + ((res && res.error) || '未知错误'));
                }
            } catch (err) {
                console.error('[copy] 写入剪贴板失败：', err);
                showAppToast('复制失败：' + err.message);
            }
        });


        function updateNoteContent(editable) {
            const noteId = parseInt(editable.getAttribute('data-note-id'));
            if (!isNaN(noteId)) {
                const note = notes.find(n => n.id === noteId);
                if (note) {
                    // 用序列化函数保存：不把懒加载占位图 / data-src 状态写进任务数据
                    const next = serializeEditable(editable);
                    if (note.content === next) return;
                    note.content = next;
                    save();
                }
            }
        }
        
        function updateTableNote(noteId, editable) {
            const note = notes.find(n => n.id === noteId);
            if (note) {
                const next = serializeEditable(editable);
                if (note.content === next) return;
                note.content = next;
                save();
            }
        }
        
        /**
         * 【2026-11-05】粘贴进来的表格里，回车要留给单元格编辑：
         * 否则表格视图会吞掉回车、卡片视图 / 输入框还会顺手触发「添加任务」。
         */
        function isInsidePastedTable(e) {
            const t = e && e.target;
            return !!(t && t.closest && t.closest('.pasted-table'));
        }

        function handleTableNoteKeydown(e) {
            if (isInsidePastedTable(e)) return;
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            }
        }

        /**
         * 表格视图用的日期：日期与时间各自成段、各自不可断行，只在两者之间允许换行。
         * 【2026-09-30 修复】之前直接输出 "2026-09-29 18:45:31" 一整串，列一窄浏览器就从
         * 中间的连字符处断开（"2026-09-" / "29" / "18:45:31"），看起来就是"创建时间错位"。
         * 现在宽列 → 一行；窄列 → 干净的"日期 / 时间"两行，不会再出现碎片。
         */
        function formatDatePair(timestamp) {
            const parts = String(formatDate(timestamp)).split(' ');
            return `<span class="dt-date">${parts[0] || ''}</span> <span class="dt-time">${parts[1] || ''}</span>`;
        }

        function formatDate(timestamp) {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            // 【2026-09-30】年份按设置决定是否显示（showYear，见设置面板「日期显示年份」）
            const datePart = showYear ? `${year}-${month}-${day}` : `${month}-${day}`;
            return `${datePart} ${hours}:${minutes}:${seconds}`;
        }

        /**
         * 批注文字归一化（2026-10-27）
         * 输入框里回车存的是 \n，但 AI / 本地接口（POST /api/tasks/:id/comments）常常直接塞
         * "<br>" 这种 HTML 换行——渲染时被转义，界面上就会出现一排字面量 <br>。
         * 这里统一：常见标签转成 markdown 或换行，剩下的标签直接剥掉，实体还原成字符。
         */
        function normalizeCommentText(text) {
            let s = String(text == null ? '' : text);
            if (s.indexOf('<') !== -1) {
                // 链接：<a href="…">文字</a> → [文字](url)，只留 http(s)
                s = s.replace(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
                    const clean = String(label).replace(/<[^>]*>/g, '').trim();
                    return /^https?:\/\//i.test(href) ? '[' + clean + '](' + href + ')' : clean;
                });
                // 标题：<h1>~<h6> → '#' × 级别
                s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, inner) =>
                    '\n' + '#'.repeat(Number(n)) + ' ' + String(inner).trim() + '\n');
                // 有序列表：整体编号成 1. 2. 3.
                s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (m, inner) => {
                    let i = 0;
                    const items = String(inner).replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (mm, item) =>
                        '\n' + (++i) + '. ' + String(item).trim());
                    return '\n' + items + '\n';
                });
                // 无序列表（剩下的 li 都算无序；保留内部标签，交给后面的强调规则）
                s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item) => '\n- ' + String(item).trim() + '\n');
                // 引用 / 分隔线 / 代码块
                s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, inner) =>
                    '\n' + String(inner).trim().split(/\n+/).map(l => '> ' + l).join('\n') + '\n');
                s = s.replace(/<hr\b[^>]*>/gi, '\n---\n');
                s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) =>
                    '\n' + String(inner).replace(/<[^>]*>/g, '') + '\n');
                // 行内强调
                s = s.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
                    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
                    .replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~')
                    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/(div|p|li|tr|ul|ol|table|thead|tbody)>/gi, '\n')
                    .replace(/<(div|p|li|tr|ul|ol|table|thead|tbody)[^>]*>/gi, '')
                    // 其余标签剥掉，但只认「像标签」的形状（<b>、</span>），
                    // 免得把 "x < y > z" 这种正常文字吃掉
                    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^<>]*)?\/?>/g, '');
            }
            if (s.indexOf('&') !== -1) {
                s = s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            }
            // 去掉每行尾部空白，压缩连续空行；列表项之间的空行也收掉（否则每条前面一大段空白）
            s = s.replace(/\r\n?/g, '\n')
                .split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/\n{1,2}(?=[ \t]*(?:[-*+][ \t]|\d{1,3}[.)][ \t]))/g, '\n')
                .trim();
            return s;
        }

        function renderCommentText(text) {
            // 批注同样支持 markdown（**粗体** / *斜体* / `代码` / # 标题 …）；
            // [img]表情名[/img] 先抽成占位符，避免表情文件名里的 _ 被当成斜体标记
            const imgs = [];
            const withPlaceholder = normalizeCommentText(text == null ? '' : text).replace(/\[img\](.*?)\[\/img\]/g, (m, name) => {
                imgs.push(name);
                return '\u0003' + (imgs.length - 1) + '\u0003';
            });
            return mdTextToHtml(withPlaceholder).replace(/\u0003(\d+)\u0003/g, (m, i) =>
                '<img src="表情包/' + (imgs[+i] || '') + '" style="width: 100px; height: 100px; object-fit: cover; vertical-align: middle; border-radius: 8px;">');
        }

        window.toggleDone = id => {
            const n = notes.find(x => x.id === id);
            if (n) {
                n.done = !n.done;
                if (n.done) {
                    n.doneTime = Date.now();
                } else {
                    delete n.doneTime;
                }
                save();
            } else {
                const idx = archivedNotes.findIndex(x => x.id === id);
                if (idx !== -1) {
                    const note = archivedNotes[idx];
                    archivedNotes.splice(idx, 1);
                    note.done = false;
                    delete note.doneTime;
                    notes.push(note);
                    save();
                    saveArchive();
                }
            }
        };

        function getTaskAndSave(id, modifierFn) {
            let found = notes.find(x => x.id === id);
            if (found) {
                modifierFn(found);
                save();
                return;
            }
            found = archivedNotes.find(x => x.id === id);
            if (found) {
                modifierFn(found);
                saveArchive();
            }
        }

        window.togglePriority = id => {
            getTaskAndSave(id, n => {
                if (n.p === 1) n.p = 2;
                else if (n.p === 2) n.p = 3;
                else n.p = 1;
            });
        };

        window.toggleType = id => {
            getTaskAndSave(id, n => {
                n.type = n.type === 'short' ? 'long' : 'short';
            });
        };

        window.updateNote = (id, v) => {
            getTaskAndSave(id, n => {
                n.content = v.trim();
            });
        };

        /** 评论输入框 → 存储文本：普通文字 + [img]表情包文件名[/img]（卡片 / 表格共用） */
        function commentInputToText(input) {
            let text = '';
            if (!input) return text;
            input.childNodes.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    if (child.tagName === 'IMG') {
                        const src = child.getAttribute('src') || child.src || '';
                        const imgName = decodeURIComponent(src.split('/').pop().split('?')[0]);
                        if (imgName) text += `[img]${imgName}[/img]`;
                    } else if (child.tagName === 'BR') {
                        text += '\n';
                    } else {
                        text += child.textContent || '';
                    }
                }
            });
            return text.trim();
        }

        window.addComment = id => {
            const input = document.getElementById('c_' + id);
            let text = '';
            if (input) {
                text = commentInputToText(input);
                if (!text) return;
                
                getTaskAndSave(id, n => {
                    if (!n.comments) n.comments = [];
                    n.comments.push({ text: normalizeCommentText(text), time: Date.now() });
                });
                input.innerHTML = '';
                input.setAttribute('data-has-content', 'false');
            }
        };

        window.deleteComment = (noteId, commentIndex) => {
            getTaskAndSave(noteId, n => {
                if (n.comments) {
                    n.comments.splice(commentIndex, 1);
                }
            });
        };

        window.toggleComment = (noteId) => {
            const commentArea = document.getElementById(`commentArea_${noteId}`);
            const emojiPanel = document.getElementById(`emoji_${noteId}`);
            
            if (commentArea.style.display === 'none' || commentArea.style.display === '') {
                commentArea.style.display = 'flex';
            } else {
                commentArea.style.display = 'none';
                emojiPanel.classList.remove('show');
            }
        };

        window.toggleEmojiPanel = (noteId, panelId) => {
            const panel = document.getElementById(panelId || `emoji_${noteId}`);
            if (!panel) return;
            const open = !panel.classList.contains('show');
            panel.classList.toggle('show', open);
            // 【2026-10-22】表情图默认走懒加载，而面板默认是 display:none ——
            // 观察器在隐藏状态下不触发，展开后经常还是一格格空白（看起来就是「表情包没了」）。
            // 打开时直接把占位图换成真图，保证一按就能看到全部表情。
            if (open) {
                panel.querySelectorAll('img[data-src]').forEach(img => {
                    const real = img.getAttribute('data-src');
                    if (!real) return;
                    img.src = real;
                    img.removeAttribute('data-src');
                    img.removeAttribute('data-lazy-observed');
                });
                if (typeof bindLazyImages === 'function') bindLazyImages();
            }
        };

        window.insertEmoji = (inputId, noteId, imgName, panelId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            const panel = document.getElementById(panelId || `emoji_${noteId}`);

            const img = document.createElement('img');
            img.src = `表情包/${imgName}`;
            img.className = 'preview-img';
            img.alt = '[img]';
            
            img.onclick = (e) => {
                e.stopPropagation();
                img.remove();
                updateInputPlaceholder(input);
            };
            
            input.appendChild(img);
            input.focus();
            input.setAttribute('data-has-content', 'true');

            if (panel) panel.classList.remove('show');
        };

        function updateInputPlaceholder(el) {
            const hasMedia = el.querySelectorAll('img, video').length > 0;
            if (!el.innerText.trim() && !hasMedia) {
                el.setAttribute('data-has-content', 'false');
            } else {
                el.setAttribute('data-has-content', 'true');
            }
        }

        window.handleNoteKeydown = (e) => {
            if (isInsidePastedTable(e)) return;
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('addNoteBtn').click();
            }
        };

        window.handleCommentKeydown = (e, noteId) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addComment(noteId);
            }
        };

        window.deleteNote = id => {
            notes = notes.filter(x => x.id !== id);
            save();
        };

        document.getElementById('addNoteBtn').onclick = () => {
            const noteInput = document.getElementById('noteInput');
            const c = noteInput.innerHTML.trim();
            if (!c || c === '<br>' || c.startsWith('<div><br></div>')) return;
            const projectSel = document.getElementById('noteProjectSelect');
            const project = projectSel ? projectSel.value : '';
            if (project && projects.indexOf(project) === -1) {
                projects.push(project);
                saveProjects();
            }
            notes.unshift({
                id: Date.now(),
                content: c,
                done: false,
                p: currentPriority,
                type: currentType,
                project: project || '',
                comments: [],
                ts: Date.now()
            });
            save();
            noteInput.innerHTML = '';
            if (currentView === 'table') {
                renderTable();
            }
        };
        
        // 输入框粘贴已并入全局 paste 处理器（支持微信位图 / 图片文件 / HTML 图片 / 纯文本）

        // ==================== 项目分类：工具条 / 录入区事件（2026-10-20） ====================
        // 【2026-10-22 重做项目下拉】
        // 原生 <select> 的弹层又窄又小，还会盖住下面的按钮，选起来很别扭。
        // 这里把两个项目下拉都换成「大按钮 + 浮层列表」：整行可点、带任务数、项目多能搜索，
        // 列表底部直接「新建项目 / 管理项目」。
        let openProjectMenuEl = null;
        let openProjectTriggerEl = null;

        function closeProjectMenu() {
            if (openProjectMenuEl) { openProjectMenuEl.remove(); openProjectMenuEl = null; }
            if (openProjectTriggerEl) { openProjectTriggerEl.classList.remove('open'); openProjectTriggerEl = null; }
        }

        /** 每个项目下有多少任务（活动 + 归档），用于列表里显示数量 */
        function projectTaskCounts() {
            const map = { all: 0, __none__: 0 };
            const add = n => {
                map.all++;
                const name = projectNameOf(n);
                if (!name) { map.__none__++; return; }
                map[name] = (map[name] || 0) + 1;
            };
            notes.forEach(add);
            archivedNotes.forEach(add);
            return map;
        }

        function syncProjectSelectLabel(select) {
            const trigger = select.parentNode && select.parentNode.querySelector('.project-picker-trigger');
            if (!trigger) return;
            const opt = select.options[select.selectedIndex];
            const label = trigger.querySelector('.pp-trigger-text');
            if (label) label.textContent = (opt && opt.textContent) || '未分类';
            trigger.classList.toggle('is-empty', !select.value || select.value === 'all' || select.value === '__none__');
            trigger.title = '点击选择项目（当前：' + ((opt && opt.textContent) || '未分类') + '）';
        }

        function openProjectMenu(trigger, select, opts) {
            const alreadyThis = openProjectTriggerEl === trigger && openProjectMenuEl;
            closeProjectMenu();
            if (alreadyThis) return;
            opts = opts || {};

            const menu = document.createElement('div');
            menu.className = 'project-menu';
            menu.innerHTML =
                (select.options.length > 8 ? '<input class="project-menu-search" type="text" placeholder="搜索项目…">' : '') +
                '<div class="project-menu-list"></div>' +
                '<div class="project-menu-footer">' +
                '<button type="button" class="pm-menu-btn" data-act="create">＋ 新建项目</button>' +
                '<button type="button" class="pm-menu-btn" data-act="manage">管理项目…</button>' +
                '</div>';
            document.body.appendChild(menu);
            openProjectMenuEl = menu;
            openProjectTriggerEl = trigger;
            trigger.classList.add('open');

            const list = menu.querySelector('.project-menu-list');
            const counts = opts.showCounts ? projectTaskCounts() : null;

            const renderList = (kw) => {
                const keyword = (kw || '').trim().toLowerCase();
                list.innerHTML = '';
                Array.from(select.options).forEach(opt => {
                    if (keyword && opt.textContent.toLowerCase().indexOf(keyword) === -1) return;
                    const row = document.createElement('button');
                    row.type = 'button';
                    row.className = 'project-menu-item' + (opt.value === select.value ? ' active' : '');
                    const count = counts && counts[opt.value];
                    row.innerHTML = '<span class="pm-name">' + escapeHtml(opt.textContent) + '</span>' +
                        (count ? '<span class="pm-count">' + count + '</span>' : '') +
                        (opt.value === select.value ? '<span class="pm-check">✓</span>' : '');
                    row.onclick = () => {
                        if (select.value !== opt.value) {
                            select.value = opt.value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        syncProjectSelectLabel(select);
                        closeProjectMenu();
                    };
                    list.appendChild(row);
                });
                if (!list.children.length) {
                    list.innerHTML = '<div class="project-menu-empty">没有匹配的项目</div>';
                }
                // 让当前选中项自动出现在可视区域
                const activeRow = list.querySelector('.project-menu-item.active');
                if (activeRow && !keyword) activeRow.scrollIntoView({ block: 'nearest' });
            };
            renderList('');

            const search = menu.querySelector('.project-menu-search');
            if (search) {
                search.addEventListener('input', () => renderList(search.value));
                setTimeout(() => search.focus(), 30);
            }

            menu.querySelector('[data-act="create"]').onclick = () => {
                closeProjectMenu();
                openProjectManager(true, name => {
                    if (select.options.length !== undefined) {
                        select.value = name;
                        syncProjectSelectLabel(select);
                    }
                    if (typeof opts.onCreated === 'function') opts.onCreated(name);
                });
            };
            menu.querySelector('[data-act="manage"]').onclick = () => {
                closeProjectMenu();
                openProjectManager(false, name => {
                    select.value = name;
                    syncProjectSelectLabel(select);
                    if (typeof opts.onCreated === 'function') opts.onCreated(name);
                });
            };

            // 定位：优先在按钮下方展开，空间不够就翻到上方；左右不越界
            const r = trigger.getBoundingClientRect();
            if (!r.width && !r.height) { closeProjectMenu(); return; } // 按钮被折叠/隐藏时不弹
            const gap = 6;
            const pad = 10;
            menu.style.minWidth = Math.max(Math.round(r.width), 210) + 'px';
            const availBelow = window.innerHeight - r.bottom - gap - pad;
            const availAbove = r.top - gap - pad;
            const naturalH = menu.offsetHeight;
            const goUp = naturalH > availBelow && availAbove > availBelow;
            const avail = goUp ? availAbove : availBelow;
            if (naturalH > avail) menu.style.maxHeight = Math.max(180, avail) + 'px';
            const mh = menu.offsetHeight;
            const mw = menu.offsetWidth;
            let top = goUp ? (r.top - gap - mh) : (r.bottom + gap);
            top = Math.max(pad, Math.min(top, window.innerHeight - mh - pad));
            let left = Math.min(r.left, window.innerWidth - mw - pad);
            menu.style.top = Math.round(top) + 'px';
            menu.style.left = Math.max(pad, Math.round(left)) + 'px';
        }

        /** 把原生 select 包装成「大按钮 + 浮层」，select 本身隐藏但仍是唯一数据源 */
        function enhanceProjectSelect(select, opts) {
            if (!select) return;
            if (select.dataset.ppEnhanced === '1') { syncProjectSelectLabel(select); return; }
            select.dataset.ppEnhanced = '1';
            select.classList.add('project-select-hidden');

            const wrap = document.createElement('div');
            wrap.className = 'project-picker-wrap';
            select.parentNode.insertBefore(wrap, select);
            wrap.appendChild(select);

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'project-picker-trigger';
            trigger.innerHTML = '<span class="pp-trigger-text">未分类</span><span class="pp-caret">▾</span>';
            wrap.appendChild(trigger);

            trigger.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                openProjectMenu(trigger, select, opts || {});
            });

            // 值变化（包括代码里直接赋值 + dispatch change）都同步按钮文字
            select.addEventListener('change', () => syncProjectSelectLabel(select));
            // options 变了（新增 / 重命名 / 删除项目）就同步按钮上的文字
            new MutationObserver(() => syncProjectSelectLabel(select)).observe(select, { childList: true, subtree: true });
            syncProjectSelectLabel(select);
        }

        // 点空白处 / 滚动 / 按 Esc 都要收起浮层，避免它浮在页面上挡住别的按钮
        document.addEventListener('pointerdown', (e) => {
            if (!openProjectMenuEl) return;
            if (openProjectMenuEl.contains(e.target)) return;
            if (openProjectTriggerEl && openProjectTriggerEl.contains(e.target)) return;
            closeProjectMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeProjectMenu();
        });
        window.addEventListener('resize', closeProjectMenu);
        document.addEventListener('scroll', (e) => {
            // 浮层自己内部滚动时别关掉（项目多的时候要能在列表里滑）
            if (openProjectMenuEl && e.target && openProjectMenuEl.contains(e.target)) return;
            closeProjectMenu();
        }, true);

        const projectFilterSelectEl = document.getElementById('projectFilterSelect');
        if (projectFilterSelectEl) {
            projectFilterSelectEl.onchange = () => {
                projectFilter = projectFilterSelectEl.value || 'all';
                localStorage.setItem('projectFilter', projectFilter);
                render(true);
                if (currentView === 'table') renderTable(true);
                if (isArchiveExpanded) renderArchiveHistory();
            };
            enhanceProjectSelect(projectFilterSelectEl, {
                showCounts: true,
                onCreated: (name) => {
                    projectFilter = name;
                    localStorage.setItem('projectFilter', projectFilter);
                    projectFilterSelectEl.value = name;
                    syncProjectSelectLabel(projectFilterSelectEl);
                    render(true);
                    if (currentView === 'table') renderTable(true);
                    if (isArchiveExpanded) renderArchiveHistory();
                    showAppToast('已按项目「' + name + '」筛选');
                }
            });
        }
        /** 把录入区当前选中的项目写进 localStorage，下次启动还原 */
        function rememberNoteProject() {
            const sel = document.getElementById('noteProjectSelect');
            if (!sel) return;
            const next = sel.value || '';
            lastNoteProject = next;
            localStorage.setItem('lastNoteProject', next);
        }

        const noteProjectSelectEl = document.getElementById('noteProjectSelect');
        if (noteProjectSelectEl) {
            enhanceProjectSelect(noteProjectSelectEl, {
                onCreated: () => rememberNoteProject()
            });
            syncProjectSelectLabel(noteProjectSelectEl);
            // 手动切换（含点「未分类」清空）后立刻记下来
            noteProjectSelectEl.addEventListener('change', rememberNoteProject);
        }
        const manageProjectsBtnEl = document.getElementById('manageProjectsBtn');
        if (manageProjectsBtnEl) manageProjectsBtnEl.onclick = () => openProjectManager(false);
        const addProjectQuickBtnEl = document.getElementById('addProjectQuickBtn');
        if (addProjectQuickBtnEl) {
            addProjectQuickBtnEl.onclick = () => openProjectManager(true, (name) => {
                if (!noteProjectSelectEl) return;
                noteProjectSelectEl.value = name;
                syncProjectSelectLabel(noteProjectSelectEl);
                rememberNoteProject();
                showAppToast('新任务将归入「' + name + '」');
            });
        }

        // 「📁 项目」小标题也可以点，命中面积比下拉按钮大得多
        const projectRowLabelEl = document.querySelector('.project-row-label');
        if (projectRowLabelEl && noteProjectSelectEl) {
            projectRowLabelEl.style.cursor = 'pointer';
            projectRowLabelEl.title = '点击选择任务所属项目';
            projectRowLabelEl.onclick = () => {
                const trigger = noteProjectSelectEl.parentNode.querySelector('.project-picker-trigger');
                if (trigger) trigger.click();
            };
        }
        const projectGroupLabelEls = Array.from(document.querySelectorAll('.tool-group-label'))
            .filter(el => el.textContent.trim() === '项目');
        projectGroupLabelEls.forEach(el => {
            if (!projectFilterSelectEl) return;
            el.style.cursor = 'pointer';
            el.title = '点击按项目筛选';
            el.onclick = () => {
                const trigger = projectFilterSelectEl.parentNode.querySelector('.project-picker-trigger');
                if (trigger) trigger.click();
            };
        });
        const groupByProjectToggleEl = document.getElementById('groupByProjectToggle');
        if (groupByProjectToggleEl) {
            groupByProjectToggleEl.checked = groupByProject;
            groupByProjectToggleEl.onchange = () => {
                groupByProject = !!groupByProjectToggleEl.checked;
                localStorage.setItem('groupByProject', groupByProject ? 'true' : 'false');
                render(true);
                showAppToast(groupByProject ? '已按项目分组显示' : '已取消按项目分组');
            };
        }

        // 处理输入框回车添加笔记
        document.getElementById('noteInput').addEventListener('keydown', (e) => {
            if (isInsidePastedTable(e)) return;
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('addNoteBtn').click();
            }
        });

        document.getElementById('exportBtn').onclick = () => {
            const a = document.createElement('a');
            const exportData = {
                notes: notes,
                archived_notes: archivedNotes,
                projects: projects
            };
            a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)]));
            a.download = 'notes.json';
            a.click();
        };

        document.getElementById('archiveBtn').onclick = () => {
            const completed = notes.filter(n => n.done);
            if (completed.length === 0) {
                alert('当前活跃列表中没有已完成的任务。');
                return;
            }
            completed.forEach(n => {
                if (!n.doneTime) n.doneTime = Date.now();
                archivedNotes.push(n);
            });
            notes = notes.filter(n => !n.done);
            save();
            saveArchive();
            alert(`已成功将 ${completed.length} 个已完成任务移入归档历史！`);
        };

        let isCleanMode = false;
        let pulseEnabled = true;

        document.getElementById('pulseToggle').onchange = (e) => {
            pulseEnabled = e.target.checked;
            const timeText = document.getElementById('timeText');
            if (pulseEnabled) {
                timeText.classList.remove('no-pulse');
            } else {
                timeText.classList.add('no-pulse');
            }
            localStorage.setItem('pulseEnabled', pulseEnabled);
        };

        const savedPulse = localStorage.getItem('pulseEnabled');
        if (savedPulse !== null) {
            pulseEnabled = savedPulse === 'true';
            document.getElementById('pulseToggle').checked = pulseEnabled;
            if (!pulseEnabled) {
                document.getElementById('timeText').classList.add('no-pulse');
            }
        }

        // 获取当前字体大小系数（保持向后兼容）
        function getFontSizeFactor() {
            const savedFontSize = localStorage.getItem('timerFontSize');
            if (savedFontSize) {
                return parseInt(savedFontSize) / 100;
            }
            if (isCleanMode) {
                const savedCleanSize = localStorage.getItem('cleanFontSize');
                return savedCleanSize ? parseInt(savedCleanSize) / 100 : 1;
            }
            const savedNormalSize = localStorage.getItem('normalFontSize');
            return savedNormalSize ? parseInt(savedNormalSize) / 100 : 1;
        }
        
        // 获取当前模式标签大小系数
        function getModeLabelSizeFactor() {
            const savedModeLabelSize = localStorage.getItem('modeLabelSize');
            return savedModeLabelSize ? parseInt(savedModeLabelSize) / 100 : 1;
        }
        
        document.getElementById('toggleCleanMode').onclick = () => {
            isCleanMode = !isCleanMode;
            const notesContainer = document.querySelector('.notes-container');
            const toggleBtn = document.getElementById('toggleCleanMode');
            const container = document.querySelector('.container');
            const clearNotesBtn = document.getElementById('clearNotes');
            const exportBtn = document.getElementById('exportBtn');
            const timeText = document.getElementById('timeText');
            const modeText = document.getElementById('modeText');
            const modeLabelSize = getModeLabelSizeFactor();
            
            if (isCleanMode) {
                notesContainer.style.display = 'none';
                toggleBtn.innerText = '完整模式';
                container.classList.add('clean-mode');
                clearNotesBtn.style.display = 'none';
                exportBtn.style.display = 'none';
                modeText.style.fontSize = (24 * modeLabelSize) + 'px';
                if (!pulseEnabled) {
                    timeText.classList.add('no-pulse');
                }
            } else {
                notesContainer.style.display = 'block';
                toggleBtn.innerText = '纯净模式';
                container.classList.remove('clean-mode');
                clearNotesBtn.style.display = 'inline-block';
                exportBtn.style.display = 'inline-block';
                modeText.style.fontSize = (24 * modeLabelSize) + 'px';
                timeText.classList.remove('no-pulse');
            }
            updateTimerFontSize();
            updateGlowEffect();
            localStorage.setItem('cleanMode', isCleanMode ? 'true' : 'false');
        };

        document.getElementById('clearNotes').onclick = () => {
            const opt = confirm('【确定清空活跃任务】？\n点击“确定”仅清空当前未完成任务列表（归档历史会被保留）。\n点击“取消”取消操作。');
            if (opt) {
                notes = [];
                save();
            }
        };

        document.getElementById('switchBtn').onclick = () => {
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('toggle-mode');
                } catch(e) {}
            }
        };

        function handleToggleMode() {
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('toggle-mode');
                } catch(e) {}
            }
        }

        const floatLockBtn = document.getElementById('floatLockBtn');
        
        // 锁定按钮点击
        floatLockBtn.onclick = () => {
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('toggle-float-lock');
                } catch(e) {}
            }
        };

        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                
                // 悬浮窗任务同步事件监听
                ipcRenderer.on('request-notes-from-float', () => {
                    ipcRenderer.send('sync-notes-to-float', notes);
                });
                
                ipcRenderer.on('float-toggle-done', (event, id) => {
                    window.toggleDone(id);
                });
                
                ipcRenderer.on('float-edit-note', (event, data) => {
                    const n = notes.find(x => x.id === data.id);
                    if (n) {
                        n.content = data.content;
                        save();
                    }
                });
                
                ipcRenderer.on('float-add-note', (event, content) => {
                    notes.unshift({
                        id: Date.now(),
                        content: content,
                        done: false,
                        p: currentPriority || 1,
                        type: currentType || 'short',
                        comments: [],
                        ts: Date.now()
                    });
                    save();
                });

                ipcRenderer.on('toggle-mode', handleToggleMode);
                ipcRenderer.on('toggle-timer', toggleTimer);
                ipcRenderer.on('get-timer-status', (event) => {
                    ipcRenderer.send('get-timer-status');
                });
                ipcRenderer.on('timer-status', (event, status) => {
                    isWorking = status.isWorking;
                    currentTime = status.currentTime;
                    updateTimeDisplay();
                    modeText.innerText = status.isWorking ? '工作时间' : '休息时间';
                    document.getElementById('startBtn').innerText = status.isRunning ? '暂停' : '开始';
                });
                ipcRenderer.on('timer-end', (event, data) => {
                    playEndSound();
                    const msg = data.isWorking ? "工作结束啦" : "休息结束啦";
                    const tip = document.createElement('div');
                    tip.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#ff3366;color:#fff;padding:30px 50px;border-radius:12px;font-size:24px;z-index:99999';
                    tip.innerText = msg;
                    document.body.appendChild(tip);
                    setTimeout(() => tip.remove(), 3000);
                });
                ipcRenderer.on('set-timer-time', (event, data) => {
                    currentTime = data.minutes * 60 + data.seconds;
                    updateTimeDisplay();
                });
                
                // 悬浮窗打开时显示锁定按钮
                ipcRenderer.on('float-window-opened', () => {
                    floatLockBtn.style.display = 'inline-block';
                    // 请求当前锁定状态
                    ipcRenderer.send('get-float-locked');
                    // 把当前的显示设置与任务列表推送给刚打开的悬浮窗
                    try { pushFloatContentSettings(); } catch(e) {}
                    ipcRenderer.send('sync-notes-to-float', notes);
                });
                
                // 悬浮窗关闭时隐藏锁定按钮
                ipcRenderer.on('float-window-closed', () => {
                    floatLockBtn.style.display = 'none';
                });
                
                // 锁定状态改变时更新按钮
                ipcRenderer.on('float-locked-status', (event, isLocked) => {
                    floatLockBtn.innerText = isLocked ? '🔒' : '🔓';
                });
                
                ipcRenderer.on('float-locked-changed', (event, isLocked) => {
                    floatLockBtn.innerText = isLocked ? '🔒' : '🔓';
                });
                
                // 监听全屏状态变化
                ipcRenderer.on('fullscreen-status', (event, isFullscreen) => {
                    const settingsBtn = document.getElementById('settingsBtn');
                    if (isFullscreen) {
                        settingsBtn.style.display = 'none';
                    } else {
                        settingsBtn.style.display = 'flex';
                    }
                });
            } catch(e) {}
        }

        // 备用的纯JS计时器（用于测试）
        let localTimer = null;
        
        function localToggleTimer() {
            console.log('🔘 开始/暂停按钮被点击');
            const startBtn = document.getElementById('startBtn');
            
            if (localTimer) {
                clearInterval(localTimer);
                localTimer = null;
                startBtn.innerText = '开始';
                console.log('⏸️ 计时器已暂停');
            } else {
                localTimer = setInterval(() => {
                    currentTime--;
                    if (currentTime <= 0) {
                        clearInterval(localTimer);
                        localTimer = null;
                        isWorking = !isWorking;
                        currentTime = isWorking ? WORK_TIME : REST_TIME;
                        modeText.innerText = isWorking ? '工作时间' : '休息时间';
                        startBtn.innerText = '开始';
                        playEndSound();
                    }
                    updateTimeDisplay();
                }, 1000);
                startBtn.innerText = '暂停';
                console.log('▶️ 计时器已启动');
            }
        }
        
        // 修改按钮绑定，添加调试
        document.getElementById('startBtn').onclick = () => {
            console.log('🎯 开始按钮被点击');
            if (isElectron) {
                toggleTimer();
            } else {
                localToggleTimer();
            }
        };
        
        document.getElementById('saveTimeBtn').onclick = () => {
            console.log('💾 保存按钮被点击');
            const minutes = parseInt(document.getElementById('min').textContent);
            const seconds = parseInt(document.getElementById('sec').textContent);
            const totalSeconds = minutes * 60 + seconds;
            
            if (isElectron) {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('save-default-time', {
                        isWorking: isWorking,
                        time: totalSeconds
                    });
                } catch(e) {
                    console.error('Electron IPC错误:', e);
                }
            }
            
            // 显示提示（总是显示）
            const tip = document.createElement('div');
            tip.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#28a745;color:#fff;padding:20px 40px;border-radius:12px;font-size:20px;z-index:99999';
            tip.innerText = isWorking ? `工作时间已设为 ${minutes}分${seconds}秒` : `休息时间已设为 ${minutes}分${seconds}秒`;
            document.body.appendChild(tip);
            setTimeout(() => tip.remove(), 2000);
        };
        
        // 切换按钮
        document.getElementById('switchBtn').onclick = () => {
            console.log('🔄 切换按钮被点击');
            if (isElectron) {
                handleToggleMode();
            } else {
                isWorking = !isWorking;
                currentTime = isWorking ? WORK_TIME : REST_TIME;
                modeText.innerText = isWorking ? '工作时间' : '休息时间';
                updateTimeDisplay();
            }
        };
        
        // 悬浮窗按钮
        document.getElementById('openFloatBtn').onclick = () => {
            console.log('🪟 悬浮窗按钮被点击');
            if (!isElectron) {
                alert('⚠️ 悬浮窗功能需要在Electron环境中运行！\n请使用 npm start 命令启动应用');
                return;
            }
            // 原有逻辑保持不变
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('toggle-float-window');
                    return;
                } catch(e) {
                    console.error('悬浮窗错误:', e);
                }
            }
        };

        // 右键「悬浮窗」按钮 → 复位到屏幕正中间（透明窗口跑到屏幕外/糊在壁纸里时的救命入口）
        document.getElementById('openFloatBtn').oncontextmenu = (e) => {
            e.preventDefault();
            if (!isElectron) return;
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('reset-float-window');
                showAppToast('悬浮窗已复位到屏幕中间');
            } catch (err) {
                console.error('复位悬浮窗失败:', err);
            }
        };
        let currentSort = 'time_asc';
        
        let sortBy = 'time';
        let sortOrder = 'asc';
        
        document.getElementById('filterToggle').onclick = () => {
            const menu = document.getElementById('filterMenu');
            menu.classList.toggle('show');
        };
        
        document.addEventListener('click', (e) => {
            const filterDropdown = document.querySelector('.filter-dropdown');
            if (!filterDropdown.contains(e.target)) {
                document.getElementById('filterMenu').classList.remove('show');
            }
        });
        

        function toggleSort(field) {
            // 切换当前字段的排序方向
            sortDirections[field] = sortDirections[field] === 'asc' ? 'desc' : 'asc';
            // 保存排序方向
            localStorage.setItem('sortDirections', JSON.stringify(sortDirections));
            
            const sortNames = {
                'time': '时间',
                'priority': '紧急',
                'done': '未完成'
            };
            
            // 更新所有按钮的显示状态
            document.querySelectorAll('.sort-btn').forEach(btn => {
                const btnField = btn.id.replace('sort', '').toLowerCase();
                const direction = sortDirections[btnField];
                const orderText = direction === 'asc' ? '↑' : '↓';
                
                // 更新按钮类名
                if (direction === 'desc') {
                    btn.classList.add('desc');
                } else {
                    btn.classList.remove('desc');
                }
                
                btn.innerHTML = sortNames[btnField] + ' <span>' + orderText + '</span>';
            });
            
            render();
            if (currentView === 'table') renderTable();
        }
        
        document.getElementById('sortTime').onclick = () => toggleSort('time');
        document.getElementById('sortPriority').onclick = () => toggleSort('priority');
        document.getElementById('sortDone').onclick = () => toggleSort('done');
        
        function updateFilter(filter) {
            cardRenderLimit = 15;
            currentFilter = filter;
            // 保存筛选状态
            localStorage.setItem('currentFilter', filter);
            
            const toggleBtn = document.getElementById('filterToggle');
            const filterNames = {
                'all': '全部',
                'undone': '未完成',
                'done': '已完成',
                'p3': '紧急',
                'p2': '中等',
                'p1': '不紧急'
            };
            toggleBtn.textContent = '筛选: ' + filterNames[filter] + ' ▼';
            
            document.querySelectorAll('.filter-option').forEach(b => b.classList.remove('active'));
            document.getElementById('filter' + (filter === 'all' ? 'All' : filter === 'undone' ? 'Undone' : filter === 'done' ? 'Done' : 'P' + filter.charAt(1).toUpperCase())).classList.add('active');
            
            document.getElementById('filterMenu').classList.remove('show');
            render(true);
            if (currentView === 'table') renderTable();
        }
        
        document.getElementById('filterAll').onclick = () => updateFilter('all');
        document.getElementById('filterUndone').onclick = () => updateFilter('undone');
        document.getElementById('filterDone').onclick = () => updateFilter('done');
        document.getElementById('filterP3').onclick = () => updateFilter('p3');
        document.getElementById('filterP2').onclick = () => updateFilter('p2');
        document.getElementById('filterP1').onclick = () => updateFilter('p1');

        document.querySelectorAll('.priority-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.priority-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                currentPriority = +b.dataset.p;
            };
        });

        document.querySelectorAll('.type-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.type-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                currentType = b.dataset.type;
            };
        });

        updateTimeDisplay();
        
        // 加载保存的筛选状态
        const savedFilter = localStorage.getItem('currentFilter');
        if (savedFilter) {
            // 白名单兜底：localStorage 脏值会让下面的按钮查找返回 null 直接崩
            const validFilters = ['all', 'undone', 'done', 'p3', 'p2', 'p1'];
            if (validFilters.indexOf(savedFilter) !== -1) {
                currentFilter = savedFilter;
            } else {
                currentFilter = 'all';
                localStorage.setItem('currentFilter', 'all');
            }
            // 更新筛选按钮显示
            const filterNames = {
                'all': '全部',
                'undone': '未完成',
                'done': '已完成',
                'p3': '紧急',
                'p2': '中等',
                'p1': '不紧急'
            };
            document.getElementById('filterToggle').textContent = '筛选: ' + filterNames[currentFilter] + ' ▼';
            document.querySelectorAll('.filter-option').forEach(b => b.classList.remove('active'));
            const filterBtn = document.getElementById('filter' + (currentFilter === 'all' ? 'All' : currentFilter === 'undone' ? 'Undone' : currentFilter === 'done' ? 'Done' : 'P' + currentFilter.charAt(1).toUpperCase()));
            if (filterBtn) filterBtn.classList.add('active');
        }
        
        // 初始化排序按钮显示
        const sortNames = {
            'time': '时间',
            'priority': '紧急',
            'done': '未完成'
        };
        document.querySelectorAll('.sort-btn').forEach(btn => {
            const btnField = btn.id.replace('sort', '').toLowerCase();
            const direction = sortDirections[btnField];
            const orderText = direction === 'asc' ? '↑' : '↓';
            
            if (direction === 'desc') {
                btn.classList.add('desc');
            } else {
                btn.classList.remove('desc');
            }
            
            btn.innerHTML = sortNames[btnField] + ' <span>' + orderText + '</span>';
        });
        
        // 项目下拉框 / 筛选框必须先把登记表补齐再渲染，否则首屏会把已有项目当成「未分类」
        refreshProjectUI();
        render();
        renderArchiveHistory();
        
        // 软件启动时，延迟 2 秒在后台悄悄将所有历史/活跃笔记中的旧 Base64 图片导出存盘并替换为本地绝对路径 URL，完成后顺便执行一次 GC
        if (typeof require !== 'undefined') {
            setTimeout(() => {
                migrateBase64Notes()
                    .then(() => triggerImageGarbageCollection())
                    .catch(err => console.error('迁移旧 Base64 任务后台进程失败:', err));
            }, 2000);
        }
        // 如果是表格视图，同时渲染表格
        if (currentView === 'table') {
            renderTable();
        }

        const savedCleanMode = localStorage.getItem('cleanMode');
        if (savedCleanMode === 'true') {
            document.getElementById('toggleCleanMode').click();
        }

        const bgContainer = document.getElementById('bgContainer');
        const bgOverlay = document.getElementById('bgOverlay');
        const bgSelector = document.getElementById('bgSelector');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const darknessSlider = document.getElementById('darknessSlider');

        let bgImages = [];
        let currentBgIndex = 0;
        let bgElements = [];

        // 初始化背景图片
        async function initBgImages() {
            console.log('开始初始化背景图片');
            
            const { ipcRenderer } = require('electron');
            
            // 从主进程获取背景图片列表
            bgImages = await ipcRenderer.invoke('get-background-images');
            console.log('获取到背景图片:', bgImages.length, '张');
            
            bgImages.forEach((img, i) => {
                let imgUrl;
                if (img.isCustom) {
                    imgUrl = img.dataUrl; // 使用data URL
                } else {
                    imgUrl = `Draws/${img.name}`;
                }
                console.log('加载背景图片:', i, imgUrl.substring(0, 50) + '...', 'custom:', img.isCustom);
                
                const div = document.createElement('div');
                div.className = 'bg-image' + (i === 0 ? ' active' : '');
                div.style.backgroundImage = `url('${imgUrl}')`;
                bgContainer.insertBefore(div, bgOverlay);
                bgElements.push(div);

                const thumbContainer = document.createElement('div');
                thumbContainer.className = 'bg-thumb-container';
                thumbContainer.style.position = 'relative';
                
                const thumb = document.createElement('div');
                thumb.className = 'bg-thumb' + (i === 0 ? ' active' : '');
                thumb.style.backgroundImage = `url('${imgUrl}')`;
                thumb.onclick = () => switchBg(i);
                thumbContainer.appendChild(thumb);
                
                // 如果是自定义背景，添加删除按钮
                if (img.isCustom) {
                    const deleteBtn = document.createElement('div');
                    deleteBtn.textContent = '✕';
                    deleteBtn.style.cssText = `
                        position: absolute;
                        top: 2px;
                        right: 2px;
                        width: 18px;
                        height: 18px;
                        background: rgba(255, 59, 48, 0.9);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        cursor: pointer;
                        z-index: 10;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    `;
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteBgImage(i, img.name);
                    };
                    thumbContainer.appendChild(deleteBtn);
                }
                
                bgSelector.appendChild(thumbContainer);
            });
        }

        // 删除自定义背景图片
        async function deleteBgImage(index, fileName) {
            console.log('删除背景图片:', index, fileName);
            
            if (!confirm('确定要删除这个背景图片吗？')) {
                return;
            }
            
            const { ipcRenderer } = require('electron');
            
            ipcRenderer.once('delete-background-image-result', (event, result) => {
                if (result.success) {
                    console.log('删除成功');
                    // 重新初始化背景
                    bgContainer.innerHTML = '';
                    bgContainer.appendChild(bgOverlay);
                    bgSelector.innerHTML = '';
                    bgElements = [];
                    currentBgIndex = 0;
                    initBgImages();
                } else {
                    console.error('删除失败:', result.error);
                    alert('删除失败：' + result.error);
                }
            });
            
            ipcRenderer.send('delete-background-image', fileName);
        }

        function switchBg(index) {
            bgElements[currentBgIndex].classList.remove('active');
            bgElements[index].classList.add('active');
            
            // 更新缩略图的active状态
            const allThumbs = bgSelector.querySelectorAll('.bg-thumb');
            if (allThumbs[currentBgIndex]) allThumbs[currentBgIndex].classList.remove('active');
            if (allThumbs[index]) allThumbs[index].classList.add('active');
            
            currentBgIndex = index;
            // 保存背景索引
            localStorage.setItem('currentBgIndex', index);
            // 清除自定义背景
            localStorage.removeItem('customBg');
            bgContainer.style.backgroundImage = '';
        }

        // 先初始化，然后在DOM加载完成后恢复
        let bgInitPromise = initBgImages();

        const darknessValue = document.getElementById('darknessValue');
        
        darknessSlider.oninput = () => {
            bgOverlay.style.background = `rgba(0, 0, 0, ${darknessSlider.value / 100})`;
            darknessValue.textContent = darknessSlider.value + '%';
            localStorage.setItem('darknessLevel', darknessSlider.value);
        };
        
        const savedDarkness = localStorage.getItem('darknessLevel');
        if (savedDarkness) {
            darknessSlider.value = savedDarkness;
            darknessValue.textContent = savedDarkness + '%';
            bgOverlay.style.background = `rgba(0, 0, 0, ${savedDarkness / 100})`;
        }

        // 整体界面宽度调整逻辑
        const containerWidthSlider = document.getElementById('containerWidthSlider');
        const containerWidthValue = document.getElementById('containerWidthValue');
        const mainContainer = document.querySelector('.container');
        
        containerWidthSlider.oninput = () => {
            const w = containerWidthSlider.value;
            containerWidthValue.textContent = w + 'px';
            if (mainContainer) {
                mainContainer.style.maxWidth = w + 'px';
            }
            localStorage.setItem('containerWidth', w);
        };

        const savedWidth = localStorage.getItem('containerWidth');
        if (savedWidth) {
            containerWidthSlider.value = savedWidth;
            containerWidthValue.textContent = savedWidth + 'px';
            if (mainContainer) {
                mainContainer.style.maxWidth = savedWidth + 'px';
            }
        } else {
            if (mainContainer) {
                mainContainer.style.maxWidth = '1000px';
            }
        }

        // 【2026-09-30】日期是否显示年份：切换后立即重绘两个视图（表格 + 卡片），
        // 归档面板若已展开也一并重绘，不用重启应用。
        const showYearToggle = document.getElementById('showYearToggle');
        if (showYearToggle) {
            showYearToggle.checked = showYear;
            showYearToggle.onchange = () => {
                showYear = showYearToggle.checked;
                localStorage.setItem('showYear', showYear ? 'true' : 'false');
                try { render(); renderTable(); renderArchiveHistory(); }
                catch (e) { console.warn('[设置] 重绘日期失败：', e.message); }
            };
        }

        // ============ 【2026-09-30】设置分栏（Tab） ============
        // 面板从「一长条竖排」改成 7 个分类：外观显示 / 计时与提醒 / 悬浮窗 /
        // AI 接入 / 表格同步 / 数据与备份 / 关于。DOM id 全部保持不变，
        // 所以旧代码零改动，这里只负责切页与记住上次停留的分栏。
        const settingsTabsEl = document.getElementById('settingsTabs');
        const settingsPanesEl = document.getElementById('settingsPanes');
        let currentSettingsTab = localStorage.getItem('settingsTab') || 'appearance';

        function activateSettingsTab(name, persist) {
            if (!settingsTabsEl || !settingsPanesEl) return;
            const panes = Array.prototype.slice.call(settingsPanesEl.querySelectorAll('.settings-pane'));
            if (!panes.some(p => p.getAttribute('data-pane') === name)) return;   // 名字无效就不动
            Array.prototype.forEach.call(settingsTabsEl.querySelectorAll('.settings-tab'), t => {
                t.classList.toggle('active', t.getAttribute('data-tab') === name);
            });
            panes.forEach(p => p.classList.toggle('active', p.getAttribute('data-pane') === name));
            settingsPanesEl.scrollTop = 0;
            currentSettingsTab = name;
            if (persist !== false) localStorage.setItem('settingsTab', name);
            if (name === 'data') refreshDataStats();
        }

        if (settingsTabsEl) {
            settingsTabsEl.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.settings-tab') : null;
                if (!btn) return;
                e.stopPropagation();
                activateSettingsTab(btn.getAttribute('data-tab'));
            });
        }
        activateSettingsTab(currentSettingsTab, false);

        /** 「数据与备份」页的占用统计（localStorage 的键值按 UTF-16 粗估） */
        function refreshDataStats() {
            const el = document.getElementById('dataStats');
            if (!el) return;
            try {
                let bytes = 0;
                let keys = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k === '__store_shim' || k === '__store_rev') continue;
                    keys++;
                    bytes += (String(k).length + String(localStorage.getItem(k) || '').length) * 2;
                }
                const imgCount = (JSON.stringify(notes) + JSON.stringify(archivedNotes)).match(/<img/g);
                el.textContent = `任务 ${notes.length} 条 · 归档 ${archivedNotes.length} 条 · 本地键 ${keys} 个 · 约 ${(bytes / 1024).toFixed(0)} KB`
                    + (imgCount ? ` · 含图片 ${imgCount.length} 张` : '');
            } catch (e) {
                el.textContent = '统计失败：' + e.message;
            }
        }

        /** 导出：把 localStorage 全量打包成 JSON 下载（桌面版含图片路径，网页版含内联数据） */
        function exportAllData() {
            const storage = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k === '__store_shim' || k === '__store_rev') continue;
                    storage[k] = localStorage.getItem(k);
                }
            } catch (e) { /* ignore */ }
            const versionEl = document.getElementById('aboutVersion');
            const payload = {
                app: '专注计时器',
                version: (versionEl && versionEl.dataset.version) || '',
                exportedAt: new Date().toISOString(),
                storage: storage
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'timer-backup-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
            showAppToast('已导出备份文件');
        }

        /** 导入：接受本页导出的格式，也接受「裸 storage 对象」的旧格式 */
        function importAllData(file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result));
                    const storage = parsed && parsed.storage ? parsed.storage : parsed;
                    if (!storage || typeof storage !== 'object') throw new Error('文件里没有 storage 字段');
                    if (!confirm('导入会覆盖当前全部任务与设置，确定继续吗？')) return;
                    Object.keys(storage).forEach(k => localStorage.setItem(k, String(storage[k])));
                    showAppToast('导入完成，正在重新加载…');
                    setTimeout(() => location.reload(), 600);
                } catch (e) {
                    showAppToast('导入失败：' + e.message);
                }
            };
            reader.readAsText(file);
        }

        function clearLocalData() {
            if (!confirm('确定清空本机保存的全部任务与设置？不可撤销（建议先导出备份）。')) return;
            if (!confirm('再确认一次：清空后无法恢复。')) return;
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k === '__store_shim' || k === '__store_rev') continue;
                    localStorage.removeItem(k);
                }
            } catch (e) { /* ignore */ }
            location.reload();
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) exportDataBtn.onclick = exportAllData;
        const importDataBtn = document.getElementById('importDataBtn');
        const importDataFile = document.getElementById('importDataFile');
        if (importDataBtn && importDataFile) {
            importDataBtn.onclick = () => importDataFile.click();
            importDataFile.onchange = () => {
                if (importDataFile.files && importDataFile.files[0]) importAllData(importDataFile.files[0]);
                importDataFile.value = '';
            };
        }
        const clearLocalDataBtn = document.getElementById('clearLocalDataBtn');
        if (clearLocalDataBtn) clearLocalDataBtn.onclick = clearLocalData;

        // 关于页：桌面版才有的能力（版本号 / 检查更新），网页版要优雅降级。
        // 注意：renderer.js 里 ipcRenderer 都是局部 require 出来的，没有全局变量，
        // 这里必须自己取一次，否则会误判成网页版。
        const getElectronIpc = () => {
            try {
                const ipc = require('electron').ipcRenderer;
                return (ipc && typeof ipc.invoke === 'function') ? ipc : null;
            } catch (e) {
                return null;
            }
        };

        // 关于页版本号：桌面版问主进程要；拿不到（网页版）就显示网页版字样
        (async () => {
            const el = document.getElementById('aboutVersion');
            if (!el) return;
            const ipc = getElectronIpc();
            let version = '';
            try { version = ipc ? await ipc.invoke('app:version') : ''; } catch (e) { version = ''; }
            el.dataset.version = version || '';
            el.innerHTML = version
                ? `专注计时器 <b>v${version}</b>（桌面版）`
                : '专注计时器（网页版，数据保存在本机浏览器）';
        })();

        // 关于页：检查更新（安装包放在服务器 /timer/release/<版本号>/ 下）
        (() => {
            const statusEl = document.getElementById('updateStatus');
            const checkBtn = document.getElementById('checkUpdateBtn');
            const downloadBtn = document.getElementById('downloadUpdateBtn');
            if (!statusEl || !checkBtn || !downloadBtn) return;

            let lastInfo = null;
            let checking = false;
            const fmtSize = (n) => (n > 0 ? (n / 1048576).toFixed(1) + ' MB' : '');

            async function runCheck(manual) {
                if (checking) return;
                checking = true;
                checkBtn.disabled = true;
                statusEl.textContent = '正在检查更新…';
                downloadBtn.style.display = 'none';
                try {
                    const ipc = getElectronIpc();
                    if (!ipc) throw new Error('网页版不能自动更新，请直接用浏览器打开 gdpudev.cn/timer/');
                    const info = await ipc.invoke('update:check');
                    lastInfo = info;
                    if (!info || !info.ok) throw new Error((info && info.error) || '检查失败');
                    if (info.hasUpdate) {
                        const extra = [fmtSize(info.size), info.date].filter(Boolean).join(' · ');
                        statusEl.innerHTML = `发现新版本 <b>v${info.latest}</b>（当前 v${info.current}）` + (extra ? ` · ${extra}` : '');
                        downloadBtn.textContent = `⬇️ 下载 v${info.latest}`;
                        downloadBtn.style.display = '';
                    } else {
                        statusEl.innerHTML = `已是最新版本 <b>v${info.current}</b>`;
                    }
                } catch (e) {
                    statusEl.textContent = '检查失败：' + ((e && e.message) || e) + (manual ? '（稍后可以再试）' : '');
                } finally {
                    checking = false;
                    checkBtn.disabled = false;
                }
            }

            checkBtn.onclick = () => runCheck(true);
            downloadBtn.onclick = async () => {
                if (!lastInfo || !lastInfo.url) return;
                try {
                    const ipc = getElectronIpc();
                    if (!ipc) throw new Error('网页版不支持');
                    const r = await ipc.invoke('update:open', lastInfo.url);
                    if (r && r.ok) showAppToast('已用浏览器打开下载页');
                    else showAppToast('打开失败：' + ((r && r.error) || '未知错误'));
                } catch (e) {
                    showAppToast('打开失败：' + ((e && e.message) || e));
                }
            };

            // 切到「关于」页时自动静默检查一次（不提示失败细节，避免每次开设置都弹）
            const tabs = document.querySelectorAll('.settings-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    if (tab.dataset.tab === 'about') runCheck(false);
                });
            });
        })();

        // 等待背景初始化完成后恢复选择
        bgInitPromise.then(() => {
            // 加载自定义背景
            const savedCustomBg = localStorage.getItem('customBg');
            const savedBgIndex = localStorage.getItem('currentBgIndex');
            if (savedCustomBg) {
                bgContainer.style.backgroundImage = `url(${savedCustomBg})`;
                bgContainer.style.backgroundSize = 'cover';
                bgContainer.style.backgroundPosition = 'center';
                // 隐藏默认背景图片
                bgElements.forEach(el => el.classList.remove('active'));
            } else if (savedBgIndex) {
                // 如果有保存的背景索引，恢复它
                const bgIndex = parseInt(savedBgIndex);
                if (bgIndex >= 0 && bgIndex < bgElements.length) {
                    switchBg(bgIndex);
                }
            }
        });

        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        
        volumeSlider.oninput = () => {
            const volume = volumeSlider.value / 100;
            volumeValue.textContent = volumeSlider.value + '%';
            
            if (workAudio) workAudio.volume = volume;
            if (restAudio) restAudio.volume = volume;
            
            localStorage.setItem('timerVolume', volumeSlider.value);
        };
        
        const savedVolume = localStorage.getItem('timerVolume');
        if (savedVolume) {
            volumeSlider.value = savedVolume;
            volumeValue.textContent = savedVolume + '%';
            const volume = parseInt(savedVolume) / 100;
            if (workAudio) workAudio.volume = volume;
            if (restAudio) restAudio.volume = volume;
        }

        // 完整模式文字大小设置
        const normalFontSizeSlider = document.getElementById('normalFontSizeSlider');
        const normalFontSizeValue = document.getElementById('normalFontSizeValue');
        
        // 用函数声明（有提升）：启动时「恢复纯净模式」会在定义之前调用它；
        // 元素实时获取而不是引用下方 const，避免初始化顺序问题
        function updateTimerFontSize() {
            const timeText = document.getElementById('timeText');
            const normalSlider = document.getElementById('normalFontSizeSlider');
            const cleanSlider = document.getElementById('cleanFontSizeSlider');
            if (!timeText || !normalSlider || !cleanSlider) return;
            const normalSize = normalSlider.value / 100;
            const cleanSize = cleanSlider.value / 100;

            if (isCleanMode) {
                timeText.style.fontSize = (200 * cleanSize) + 'px';
            } else {
                timeText.style.fontSize = (100 * normalSize) + 'px';
            }
        }
        
        normalFontSizeSlider.oninput = () => {
            normalFontSizeValue.textContent = normalFontSizeSlider.value + '%';
            localStorage.setItem('normalFontSize', normalFontSizeSlider.value);
            updateTimerFontSize();
        };
        
        const savedNormalFontSize = localStorage.getItem('normalFontSize');
        if (savedNormalFontSize) {
            normalFontSizeSlider.value = savedNormalFontSize;
            normalFontSizeValue.textContent = savedNormalFontSize + '%';
        }
        
        // 纯净模式文字大小设置
        const cleanFontSizeSlider = document.getElementById('cleanFontSizeSlider');
        const cleanFontSizeValue = document.getElementById('cleanFontSizeValue');
        
        cleanFontSizeSlider.oninput = () => {
            cleanFontSizeValue.textContent = cleanFontSizeSlider.value + '%';
            localStorage.setItem('cleanFontSize', cleanFontSizeSlider.value);
            updateTimerFontSize();
        };
        
        const savedCleanFontSize = localStorage.getItem('cleanFontSize');
        if (savedCleanFontSize) {
            cleanFontSizeSlider.value = savedCleanFontSize;
            cleanFontSizeValue.textContent = savedCleanFontSize + '%';
        }
        
        // 模式标签大小设置
        const modeLabelSizeSlider = document.getElementById('modeLabelSizeSlider');
        const modeLabelSizeValue = document.getElementById('modeLabelSizeValue');
        
        const updateModeLabelSize = (sizePercent) => {
            const modeText = document.getElementById('modeText');
            const size = (24 * sizePercent / 100);
            modeText.style.fontSize = size + 'px';
        };
        
        modeLabelSizeSlider.oninput = () => {
            modeLabelSizeValue.textContent = modeLabelSizeSlider.value + '%';
            localStorage.setItem('modeLabelSize', modeLabelSizeSlider.value);
            updateModeLabelSize(modeLabelSizeSlider.value);
        };
        
        const savedModeLabelSize = localStorage.getItem('modeLabelSize');
        if (savedModeLabelSize) {
            modeLabelSizeSlider.value = savedModeLabelSize;
            modeLabelSizeValue.textContent = savedModeLabelSize + '%';
            updateModeLabelSize(savedModeLabelSize);
        }
        
        // 显示模式标签设置
        const showModeLabel = document.getElementById('showModeLabel');
        showModeLabel.onchange = () => {
            const modeText = document.getElementById('modeText');
            modeText.style.display = showModeLabel.checked ? 'block' : 'none';
            localStorage.setItem('showModeLabel', showModeLabel.checked ? 'true' : 'false');
        };
        
        const savedShowModeLabel = localStorage.getItem('showModeLabel');
        if (savedShowModeLabel !== null) {
            showModeLabel.checked = savedShowModeLabel === 'true';
            const modeText = document.getElementById('modeText');
            modeText.style.display = showModeLabel.checked ? 'block' : 'none';
        }

        window.toggleCollapsible = (id) => {
            const content = document.getElementById(id + 'Container');
            const arrow = document.getElementById(id + 'Arrow');
            content.classList.toggle('show');
            arrow.textContent = content.classList.contains('show') ? '▲' : '▼';
        };

        const timerColorPicker = document.getElementById('timerColorPicker');
        const glowEnabled = document.getElementById('glowEnabled');
        const glowColorPicker = document.getElementById('glowColorPicker');
        const glowIntensitySlider = document.getElementById('glowIntensitySlider');
        const glowIntensityValue = document.getElementById('glowIntensityValue');
        const shadowColorPicker = document.getElementById('shadowColorPicker');
        const shadowSizeSlider = document.getElementById('shadowSizeSlider');
        const shadowSizeValue = document.getElementById('shadowSizeValue');

        // 更新发光效果显示 - 直接修改样式（同样用函数声明 + 实时取元素，避免启动期 TDZ 报错）
        // 【2026-09-30 修复】旧写法把滑杆值(0-100)直接当 px 且用不透明色，100px 实心色块糊在数字后面。
        // 现改为：半透明分层光晕（亮核 + 宽柔光），滑杆只控制扩散范围。
        function hexToRgba(hex, alpha) {
            let h = String(hex || '#00a1d6').replace('#', '');
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const n = parseInt(h, 16) || 0;
            return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
        }
        function updateGlowEffect() {
            const timeEl = document.querySelector('.time');
            const glowToggle = document.getElementById('glowEnabled');
            if (!timeEl || !glowToggle) return;
            if (glowToggle.checked) {
                const color = document.getElementById('glowColorPicker').value;
                const i = Math.max(0, Math.min(100, Number(document.getElementById('glowIntensitySlider').value) || 0));
                timeEl.style.textShadow =
                    `0 0 ${Math.round(i * 0.18)}px ${hexToRgba(color, 0.9)}, ` +
                    `0 0 ${Math.round(i * 0.3) + 4}px ${hexToRgba(color, 0.55)}, ` +
                    `0 0 ${Math.round(i * 0.85)}px ${hexToRgba(color, 0.3)}`;
            } else {
                timeEl.style.textShadow = 'none';
            }
        }

        timerColorPicker.oninput = () => {
            const color = timerColorPicker.value;
            document.querySelector('.time').style.color = color;
            localStorage.setItem('timerColor', color);
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-timer-color', color);
                } catch(e) {}
            }
        };

        const savedTimerColor = localStorage.getItem('timerColor');
        if (savedTimerColor) {
            timerColorPicker.value = savedTimerColor;
            document.querySelector('.time').style.color = savedTimerColor;
        }

        glowEnabled.onchange = () => {
            updateGlowEffect();
            localStorage.setItem('glowEnabled', glowEnabled.checked ? 'true' : 'false');
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-glow-enabled', glowEnabled.checked);
                } catch(e) {}
            }
        };

        const savedGlowEnabled = localStorage.getItem('glowEnabled');
        if (savedGlowEnabled !== null) {
            glowEnabled.checked = savedGlowEnabled === 'true';
        }

        glowColorPicker.oninput = () => {
            const color = glowColorPicker.value;
            localStorage.setItem('glowColor', color);
            updateGlowEffect();
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-glow-color', color);
                } catch(e) {}
            }
        };

        const savedGlowColor = localStorage.getItem('glowColor');
        if (savedGlowColor) {
            glowColorPicker.value = savedGlowColor;
        }

        glowIntensitySlider.oninput = () => {
            const intensity = glowIntensitySlider.value;
            glowIntensityValue.textContent = intensity + '%';
            localStorage.setItem('glowIntensity', intensity);
            updateGlowEffect();
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-glow-intensity', intensity);
                } catch(e) {}
            }
        };

        const savedGlowIntensity = localStorage.getItem('glowIntensity');
        if (savedGlowIntensity) {
            glowIntensitySlider.value = savedGlowIntensity;
            glowIntensityValue.textContent = savedGlowIntensity + '%';
        }

        shadowColorPicker.oninput = () => {
            const color = shadowColorPicker.value;
            localStorage.setItem('shadowColor', color);
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-shadow-color', color);
                } catch(e) {}
            }
        };

        const savedShadowColor = localStorage.getItem('shadowColor');
        if (savedShadowColor) {
            shadowColorPicker.value = savedShadowColor;
        }

        shadowSizeSlider.oninput = () => {
            const size = shadowSizeSlider.value;
            shadowSizeValue.textContent = size + '%';
            localStorage.setItem('shadowSize', size);
            if (typeof require !== 'undefined') {
                try {
                    const { ipcRenderer } = require('electron');
                    ipcRenderer.send('update-float-shadow-size', size);
                } catch(e) {}
            }
        };

        const savedShadowSize = localStorage.getItem('shadowSize');
        if (savedShadowSize) {
            shadowSizeSlider.value = savedShadowSize;
            shadowSizeValue.textContent = savedShadowSize + '%';
        }

        // ===== 自动开始下一阶段 =====
        const autoStartNextToggle = document.getElementById('autoStartNext');
        if (autoStartNextToggle) {
            const savedAutoStart = localStorage.getItem('autoStartNext') === 'true';
            autoStartNextToggle.checked = savedAutoStart;

            const pushAutoStartNext = (val) => {
                if (typeof require !== 'undefined') {
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('set-auto-start-next', val);
                    } catch(e) {}
                }
            };

            // 启动时同步一次，确保主进程拿到当前设置（计时逻辑在主进程）
            pushAutoStartNext(savedAutoStart);

            autoStartNextToggle.onchange = () => {
                const val = autoStartNextToggle.checked;
                localStorage.setItem('autoStartNext', val ? 'true' : 'false');
                pushAutoStartNext(val);
            };
        }

        // ===== 折叠工具面板：状态摘要 =====
        function updateToolPanelSummary() {
            const el = document.getElementById('toolPanelSummary');
            if (!el) return;
            const parts = [];
            const viewBtn = document.querySelector('.view-toggle-btn.active');
            if (viewBtn) parts.push(viewBtn.textContent.replace('视图', '').trim());
            const typeBtn = document.querySelector('.type-toggle-btn.active');
            if (typeBtn) {
                const t = typeBtn.textContent.trim();
                if (t && t !== '全部') parts.push(t);
            }
            const dateBtn = document.querySelector('.date-filter-btn.active');
            if (dateBtn) parts.push(dateBtn.textContent.trim());
            const filterBtn = document.getElementById('filterToggle');
            if (filterBtn) {
                const f = filterBtn.textContent.replace('筛选:', '').replace('▼', '').trim();
                if (f && f !== '全部') parts.push(f);
            }
            if (projectFilter && projectFilter !== 'all') {
                parts.push(projectFilter === '__none__' ? '未分类' : projectFilter);
            }
            el.textContent = parts.filter(Boolean).join(' · ');
        }

        // 任何一次点击后同步摘要（读几个 DOM，开销极小）
        document.addEventListener('click', () => {
            setTimeout(updateToolPanelSummary, 60);
        });

        // ===== 悬浮窗内容显示设置（是否显示任务 / 图片 / 图片数量上限） =====
        const floatShowTask = document.getElementById('floatShowTask');
        const floatShowImages = document.getElementById('floatShowImages');
        const floatImageLimit = document.getElementById('floatImageLimit');
        const floatImageLimitValue = document.getElementById('floatImageLimitValue');

        function collectFloatContentSettings() {
            return {
                showTask: floatShowTask.checked,
                showImages: floatShowImages.checked,
                imageLimit: parseInt(floatImageLimit.value, 10) || 3
            };
        }

        function saveFloatContentSettings() {
            const s = collectFloatContentSettings();
            localStorage.setItem('floatShowTask', s.showTask ? 'true' : 'false');
            localStorage.setItem('floatShowImages', s.showImages ? 'true' : 'false');
            localStorage.setItem('floatImageLimit', String(s.imageLimit));
        }

        function pushFloatContentSettings() {
            saveFloatContentSettings();
            if (typeof require === 'undefined') return;
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('update-float-content-settings', collectFloatContentSettings());
            } catch(e) {}
        }

        floatShowTask.onchange = pushFloatContentSettings;
        floatShowImages.onchange = pushFloatContentSettings;
        floatImageLimit.oninput = () => {
            floatImageLimitValue.textContent = floatImageLimit.value + ' 张';
            pushFloatContentSettings();
        };

        (function restoreFloatContentSettings() {
            const st = localStorage.getItem('floatShowTask');
            if (st !== null) floatShowTask.checked = st === 'true';
            const si = localStorage.getItem('floatShowImages');
            if (si !== null) floatShowImages.checked = si === 'true';
            const sl = localStorage.getItem('floatImageLimit');
            if (sl) {
                floatImageLimit.value = sl;
                floatImageLimitValue.textContent = sl + ' 张';
            }
            updateToolPanelSummary();
        })();

        // 初始化应用当前字体大小和发光效果
        updateTimerFontSize();
        updateGlowEffect();

        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('show');
            // 【2026-09-30】打开面板时，停在「数据与备份」页就顺手刷新占用统计
            if (settingsPanel.classList.contains('show') && currentSettingsTab === 'data') {
                refreshDataStats();
            }
        };

        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.remove('show');
            }
        });

        window.toggleView = (viewType) => {
            if (currentView === viewType) return;
            
            cardRenderLimit = 15;
            archiveRenderLimits = {};
            currentView = viewType;
            localStorage.setItem('currentView', viewType);
            
            const cardBtn = document.querySelector('.view-toggle-btn[onclick*="card"]');
            const tableBtn = document.querySelector('.view-toggle-btn[onclick*="table"]');
            const notesList = document.getElementById('notesList');
            const tableView = document.getElementById('tableView');
            const archiveContainer = document.getElementById('archiveContainer');
            
            if (viewType === 'card') {
                if (cardBtn) cardBtn.classList.add('active');
                if (tableBtn) tableBtn.classList.remove('active');
                notesList.style.display = 'block';
                if (archiveContainer) archiveContainer.style.display = 'block';
                tableView.classList.remove('active');
            } else {
                if (cardBtn) cardBtn.classList.remove('active');
                if (tableBtn) tableBtn.classList.add('active');
                notesList.style.display = 'none';
                if (archiveContainer) archiveContainer.style.display = 'none';
                tableView.classList.add('active');
                renderTable();
            }
        };

        window.toggleTypeView = (type) => {
            if (currentTypeView === type) return;
            
            currentTypeView = type;
            localStorage.setItem('currentTypeView', type);
            
            // 更新按钮状态
            document.querySelectorAll('.type-toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.type-toggle-btn').forEach(btn => {
                if ((type === 'all' && btn.textContent === '全部') ||
                    (type === 'short' && btn.textContent === '短期') ||
                    (type === 'long' && btn.textContent === '长期')) {
                    btn.classList.add('active');
                }
            });
            
            render(true);
            if (currentView === 'table') renderTable();
        };

        // 恢复视图状态 - 必须在函数定义之后
        const savedView = localStorage.getItem('currentView');
        if (savedView === 'table') {
            // 直接设置初始状态，避免调用toggleView可能带来的问题
            currentView = 'table';
            const cardBtn = document.querySelector('.view-toggle-btn[onclick*="card"]');
            const tableBtn = document.querySelector('.view-toggle-btn[onclick*="table"]');
            const notesList = document.getElementById('notesList');
            const tableView = document.getElementById('tableView');
            const archiveContainer = document.getElementById('archiveContainer');
            
            if (cardBtn) cardBtn.classList.remove('active');
            if (tableBtn) tableBtn.classList.add('active');
            notesList.style.display = 'none';
            if (archiveContainer) archiveContainer.style.display = 'none';
            tableView.classList.add('active');
            renderTable();
        }

        // 恢复类型视图状态
        const savedTypeView = localStorage.getItem('currentTypeView');
        if (savedTypeView) {
            currentTypeView = savedTypeView;
            document.querySelectorAll('.type-toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.type-toggle-btn').forEach(btn => {
                if ((savedTypeView === 'all' && btn.textContent === '全部') ||
                    (savedTypeView === 'short' && btn.textContent === '短期') ||
                    (savedTypeView === 'long' && btn.textContent === '长期')) {
                    btn.classList.add('active');
                }
            });
        }

        window.setDateFilterMode = (mode) => {
            dateFilterMode = mode;
            const btnWeek = document.getElementById('btnThisWeek');
            const btnAll = document.getElementById('btnAllTime');
            const btnCustom = document.getElementById('btnCustomDate');
            const customInputs = document.getElementById('customDateInputs');
            
            if (btnWeek) btnWeek.classList.remove('active');
            if (btnAll) btnAll.classList.remove('active');
            if (btnCustom) btnCustom.classList.remove('active');

            if (mode === 'week') {
                if (btnWeek) btnWeek.classList.add('active');
                if (customInputs) customInputs.style.display = 'none';
            } else if (mode === 'all') {
                if (btnAll) btnAll.classList.add('active');
                if (customInputs) customInputs.style.display = 'none';
            } else {
                if (btnCustom) btnCustom.classList.add('active');
                if (customInputs) customInputs.style.display = 'flex';
                
                // 默认初始化输入框
                const startInput = document.getElementById('filterStartDate');
                const endInput = document.getElementById('filterEndDate');
                if (startInput && endInput && (!startInput.value || !endInput.value)) {
                    const range = getThisWeekRange();
                    startInput.value = formatSimpleDate(range.start);
                    endInput.value = formatSimpleDate(range.end);
                }
            }
            updateDateRangeDisplay();
            renderTable();
            render(true);
        };

        window.applyCustomDateFilter = () => {
            updateDateRangeDisplay();
            renderTable();
            render(true);
        };

        function updateDateRangeDisplay() {
            const display = document.getElementById('dateRangeDisplay');
            if (!display) return;
            if (dateFilterMode === 'week') {
                const range = getThisWeekRange();
                display.textContent = `本周范围: ${formatSimpleDate(range.start)} 至 ${formatSimpleDate(range.end)}`;
            } else if (dateFilterMode === 'all') {
                display.textContent = '范围: 全部历史时间';
            } else {
                const startVal = document.getElementById('filterStartDate').value;
                const endVal = document.getElementById('filterEndDate').value;
                if (startVal && endVal) {
                    display.textContent = `当前范围: ${startVal} 至 ${endVal}`;
                } else {
                    display.textContent = '请选择完整的起止日期';
                }
            }
        }

        function renderTable(forceReset = false) {
            const tbody = document.getElementById('tableBody');
            if (!tbody) return;
            
            if (forceReset) {
                tableRenderLimit = 30;
            }
            
            let startTs = 0;
            let endTs = 0;
            if (dateFilterMode === 'week') {
                const r = getThisWeekRange();
                startTs = r.start;
                endTs = r.end;
            } else if (dateFilterMode === 'all') {
                startTs = 0;
                endTs = Infinity;
            } else {
                const startVal = document.getElementById('filterStartDate').value;
                const endVal = document.getElementById('filterEndDate').value;
                if (startVal && endVal) {
                    startTs = new Date(startVal + 'T00:00:00').getTime();
                    endTs = new Date(endVal + 'T23:59:59').getTime();
                } else {
                    const r = getThisWeekRange();
                    startTs = r.start;
                    endTs = r.end;
                }
            }

            // 合并过滤数据：未完成任务始终可见，已完成任务按日期筛选
            let tableTasks = [];
            
            notes.forEach(n => {
                if (!n.done) {
                    tableTasks.push(n);
                } else {
                    const doneT = n.doneTime || n.ts || Date.now();
                    if (doneT >= startTs && doneT <= endTs) {
                        tableTasks.push(n);
                    }
                }
            });
            
            archivedNotes.forEach(n => {
                const doneT = n.doneTime || n.ts || Date.now();
                if (doneT >= startTs && doneT <= endTs) {
                    tableTasks.push(n);
                }
            });

            let filtered = [...tableTasks];
            
            if (currentFilter === 'undone') filtered = filtered.filter(x => !x.done);
            if (currentFilter === 'done') filtered = filtered.filter(x => x.done);
            if (currentFilter === 'p3') filtered = filtered.filter(x => x.p === 3);
            if (currentFilter === 'p2') filtered = filtered.filter(x => x.p === 2);
            if (currentFilter === 'p1') filtered = filtered.filter(x => x.p === 1);
            
            // 类型过滤
            if (currentTypeView === 'short') filtered = filtered.filter(x => x.type === 'short');
            if (currentTypeView === 'long') filtered = filtered.filter(x => x.type === 'long');

            // 关键词搜索（与卡片视图同一套规则）
            if (searchKeyword) {
                filtered = filtered.filter(x => matchKeyword(x, searchKeyword));
            }

            // 项目筛选（与卡片视图同一套规则）
            filtered = applyProjectFilter(filtered);
            
            filtered.sort((a, b) => {
                // 1. 先按完成状态排序：已完成的放下面
                const aDone = a.done ? 1 : 0;
                const bDone = b.done ? 1 : 0;
                if (aDone !== bDone) {
                    return aDone - bDone;
                }
                
                // 2. 再按优先级排序
                let priorityResult = 0;
                if (sortDirections.priority === 'asc') {
                    priorityResult = a.p - b.p;
                } else {
                    priorityResult = b.p - a.p;
                }
                if (priorityResult !== 0) {
                    return priorityResult;
                }
                
                // 3. 最后按时间排序
                if (sortDirections.time === 'asc') {
                    return a.ts - b.ts;
                } else {
                    return b.ts - a.ts;
                }
            });
            
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; padding: 20px;">暂无任务</td></tr>';
                const sentinel = document.getElementById('tableSentinel');
                if (sentinel) sentinel.style.display = 'none';
                return;
            }
            
            const limit = Math.min(filtered.length, tableRenderLimit);
            const toRender = filtered.slice(0, limit);
            
            // 采用 In-Place Patching (就地复用与修补) 算法，100% 避免移动或重绘原本就在正确位置上的 DOM 节点
            // 彻底杜绝由于 appendChild 移动节点导致的浏览器图片纹理卸载、重新加载与白屏闪烁！
            toRender.forEach((n, idx) => {
                if (!n.type) n.type = 'short';
                
                const pColor = n.p === 1 ? '#4CAF50' : n.p === 2 ? '#FF9800' : '#f44336';
                const pText = n.p === 1 ? '低' : n.p === 2 ? '中' : '高';
                const doneColor = n.done ? '#4CAF50' : '#f44336';
                const doneText = n.done ? '已完成' : '未完成';
                const typeColor = n.type === 'short' ? '#2196F3' : '#9C27B0';
                const typeText = n.type === 'short' ? '短期' : '长期';

                // 批注/评论展示
                let commentsHtml = '';
                if (n.comments && n.comments.length > 0) {
                    commentsHtml = `
                        <div class="comments-section" style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
                            ${n.comments.map((c, ci) => `
                                <div class="single-comment" style="font-size: 11px; background: rgba(255,255,255,0.03); margin-bottom: 4px; padding: 3px 6px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                                    <span class="comment-text" style="color: #aaa; text-align: left;">${lazyloadifyHtml(renderCommentText(c.text))}</span>
                                    <span class="comment-delete" onclick="deleteComment(${n.id}, ${ci}); renderTable();" style="cursor: pointer; color: #ef5350; margin-left: 8px; font-weight: bold;">✕</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // 快捷评论框（表格视图也有表情包，和卡片视图一致）
                let commentInputHtml = `
                    <div class="comment-input-area" id="tableCommentArea_${n.id}" style="display:none; margin-top:8px; padding:6px; background:rgba(0,0,0,0.25); border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
                        <div class="comment-input-wrapper" style="margin-bottom: 5px;">
                            <div class="comment-input" id="tc_${n.id}" contenteditable="true" data-placeholder="添加批注…" onkeydown="handleTableCommentKeydown(event, ${n.id})" style="min-height: 24px; font-size:12px; color:#fff; outline:none; text-align: left; background:transparent;"></div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 5px;">
                            <button class="emoji-toggle" style="font-size:11px; padding: 3px 8px; height:auto; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#bbb; border-radius:4px; cursor:pointer;" onclick="toggleEmojiPanel(${n.id}, 'temoji_${n.id}')">表情包</button>
                            <button onclick="addTableComment(${n.id})" style="font-size:11px; padding: 3px 8px; background:#4CAF50; border:none; color:#fff; border-radius:4px; cursor:pointer;">发送</button>
                        </div>
                    </div>
                    <div class="emoji-panel" id="temoji_${n.id}" style="grid-template-columns: repeat(8, 1fr); max-height: 200px;">
                        ${memeImages.map(img => `<img class="emoji lazy-img" style="width:36px;height:36px;" data-src="表情包/${img}" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==" onclick="insertEmoji('tc_${n.id}', ${n.id}, '${img}', 'temoji_${n.id}')" />`).join('')}
                    </div>
                `;
                
                const rowInnerHtml = `
                    <td style="text-align: left; vertical-align: top;">
                        <div class="table-content" contenteditable="true" onblur="updateTableNote(${n.id}, this)" onkeydown="handleTableNoteKeydown(event)" title="点击编辑任务内容" style="outline: none; color: #fff; line-height: 1.5;">${lazyloadifyHtml(mdEnhanceHtml(n.content))}</div>
                        ${commentsHtml}
                        ${commentInputHtml}
                    </td>
                    <td style="vertical-align: middle;"><span style="background:${pColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;cursor:pointer" onclick="togglePriority(${n.id});renderTable();" title="点击切换优先级">${pText}</span></td>
                    <td style="vertical-align: middle;"><span style="background:${typeColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;cursor:pointer" onclick="toggleType(${n.id});renderTable();" title="点击切换类型">${typeText}</span></td>
                    <td style="vertical-align: middle;">${projectBadgeHtml(n)}</td>
                    <td style="vertical-align: middle;"><span style="background:${doneColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;cursor:pointer" onclick="toggleDone(${n.id});renderTable();" title="点击切换完成状态">${doneText}</span></td>
                    <td style="font-size:12px;color:#888;vertical-align: middle;">${formatDatePair(n.ts)}</td>
                    <td style="font-size:12px;vertical-align: middle;">
                        ${n.done && n.doneTime ? `<span style="color: #81c784; background: rgba(76, 175, 80, 0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(76, 175, 80, 0.3); font-weight: 500;">✓ ${formatDatePair(n.doneTime)}</span>` : '<span style="color: #666;">-</span>'}
                    </td>
                    <td style="vertical-align: middle; white-space: nowrap;">
                        <button onclick="toggleTableComment(${n.id})" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:#ccc; padding:5px 8px; border-radius:4px; cursor:pointer; margin-right:5px;">💬评论</button>
                        <button onclick="toggleDone(${n.id});renderTable();" style="background:rgba(76,175,80,0.2);border:none;color:#81c784;padding:5px 8px;border-radius:4px;cursor:pointer;margin-right:5px;">${n.done ? '撤销' : '完成'}</button>
                        <button onclick="deleteNote(${n.id});renderTable();" style="background:rgba(244,67,54,0.2);border:none;color:#ef5350;padding:5px 8px;border-radius:4px;cursor:pointer;">删除</button>
                    </td>
                `;

                const newState = {
                    content: n.content,
                    done: n.done,
                    p: n.p,
                    type: n.type,
                    project: projectNameOf(n),
                    commentCount: n.comments ? n.comments.length : 0
                };

                let currentTrAtIdx = tbody.children[idx];

                // 1. 如果当前索引处的 tr 恰好就是我们要渲染的这个任务，直接在原地判断内容修改，实现零 DOM 移动！
                if (currentTrAtIdx && currentTrAtIdx.getAttribute('data-note-id') === String(n.id)) {
                    const isStateEqual = currentTrAtIdx._lastState &&
                        currentTrAtIdx._lastState.content === newState.content &&
                        currentTrAtIdx._lastState.done === newState.done &&
                        currentTrAtIdx._lastState.p === newState.p &&
                        currentTrAtIdx._lastState.type === newState.type &&
                        currentTrAtIdx._lastState.project === newState.project &&
                        currentTrAtIdx._lastState.commentCount === newState.commentCount;
                    
                    if (!isStateEqual) {
                        currentTrAtIdx.innerHTML = rowInnerHtml;
                        currentTrAtIdx._lastState = newState;
                    }
                } else {
                    // 2. 如果当前索引处的 tr 不是该任务（排序改变或新数据插入），则查找 tbody 中是否已经存在该任务的 tr
                    let existingTr = tbody.querySelector(`tr[data-note-id="${n.id}"]`);
                    
                    if (existingTr) {
                        // 存在则更新内容，并将其移入当前索引位置
                        const isStateEqual = existingTr._lastState &&
                            existingTr._lastState.content === newState.content &&
                            existingTr._lastState.done === newState.done &&
                            existingTr._lastState.p === newState.p &&
                            existingTr._lastState.type === newState.type &&
                            existingTr._lastState.project === newState.project &&
                            existingTr._lastState.commentCount === newState.commentCount;
                        
                        if (!isStateEqual) {
                            existingTr.innerHTML = rowInnerHtml;
                            existingTr._lastState = newState;
                        }
                        tbody.insertBefore(existingTr, currentTrAtIdx || null);
                    } else {
                        // 3. 完全不存在，则新建 tr 插入到当前索引位置
                        const newTr = document.createElement('tr');
                        newTr.setAttribute('data-note-id', n.id);
                        newTr.innerHTML = rowInnerHtml;
                        newTr._lastState = newState;
                        tbody.insertBefore(newTr, currentTrAtIdx || null);
                    }
                }
            });

            // 清理多余的、未被渲染的旧行（使用 lastElementChild 确保精确移除元素节点，避免 #text 文本节点引发的死循环卡死）
            while (tbody.children.length > toRender.length) {
                tbody.removeChild(tbody.lastElementChild);
            }

            bindLazyImages();
            
            // 处理表格加载更多哨兵显示
            const sentinel = document.getElementById('tableSentinel');
            if (sentinel) {
                if (filtered.length > limit) {
                    sentinel.style.display = 'block';
                    sentinel.textContent = `向下滚动加载更多任务 (已展示 ${limit}/${filtered.length})`;
                } else {
                    sentinel.style.display = 'none';
                }
            }
            bindSentinelObserver();
        }

        window.toggleTableComment = (id) => {
            const area = document.getElementById(`tableCommentArea_${id}`);
            if (area) {
                area.style.display = area.style.display === 'none' ? 'block' : 'none';
                if (area.style.display === 'block') {
                    const input = document.getElementById(`tc_${id}`);
                    if (input) input.focus();
                }
            }
        };

        window.handleTableCommentKeydown = (e, id) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addTableComment(id);
            }
        };

        window.addTableComment = (id) => {
            const input = document.getElementById(`tc_${id}`);
            if (!input) return;
            const text = commentInputToText(input);
            if (!text) return;
            
            getTaskAndSave(id, n => {
                if (!n.comments) n.comments = [];
                n.comments.push({ text: normalizeCommentText(text), time: Date.now() });
            });
            
            renderTable();
        };

        window.updateTableNote = (noteId, element) => {
            const note = notes.find(x => x.id === noteId);
            if (!note) return;
            const newContent = serializeEditable(element).trim();
            if (newContent && newContent !== note.content) {
                note.content = newContent;
                save();
            } else if (!newContent) {
                element.innerHTML = note.content;
            }
        };

        const bgFileInput = document.getElementById('bgFileInput');
        const importBgBtn = document.getElementById('importBgBtn');
        
        importBgBtn.onclick = () => {
            bgFileInput.click();
        };
        
        bgFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('开始加载文件:', file.name, file.size);
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const imgUrl = event.target.result;
                    console.log('文件加载完成，数据长度:', imgUrl.length);
                    
                    // 保存图片到Draws文件夹
                    const timestamp = Date.now();
                    const ext = file.name.split('.').pop() || 'png';
                    const fileName = `custom_bg_${timestamp}.${ext}`;
                    
                    // 通过主进程保存图片
                    const { ipcRenderer } = require('electron');
                    
                    // 监听保存结果
                    ipcRenderer.once('save-background-image-result', (event, result) => {
                        if (result.success) {
                            console.log('背景保存成功，路径:', result.filePath);
                            
                            // 重新初始化背景选择器
                            bgContainer.innerHTML = '';
                            bgContainer.appendChild(bgOverlay);
                            bgSelector.innerHTML = '';
                            bgElements = [];
                            
                            // 重新初始化并选中新添加的背景
                            initBgImages().then(() => {
                                // 找到新添加的背景索引（应该是最后一个）
                                const newIndex = bgElements.length - 1;
                                if (newIndex >= 0) {
                                    switchBg(newIndex);
                                }
                            });
                            
                            alert('背景图片导入成功！');
                        } else {
                            console.error('背景保存失败:', result.error);
                            alert('背景图片导入失败：' + result.error);
                        }
                    });
                    
                    ipcRenderer.send('save-background-image', { base64Data: imgUrl, fileName: fileName });
                };
                reader.readAsDataURL(file);
            }
        };
        
        window.importMeme = (noteId) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imgUrl = event.target.result;
                        const img = document.createElement('img');
                        img.src = imgUrl;
                        img.className = 'preview-img';
                        img.alt = '[img]';
                        
                        img.onclick = (e) => {
                            e.stopPropagation();
                            img.remove();
                        };
                        
                        const commentInput = document.getElementById(`c_${noteId}`);
                        commentInput.appendChild(img);
                        commentInput.focus();
                        commentInput.setAttribute('data-has-content', 'true');
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };

        // ============ 本地 AI 接入 API：渲染进程执行端 ============
        // 任务的真实数据在渲染进程里，API 收到的操作最终由这里执行，
        // 因此「AI 注入」和「手动添加」走的是同一条保存链路（含图片回收与悬浮窗同步）。
        if (isElectron) {
            const { ipcRenderer } = require('electron');

            function nextNoteId() {
                let id = Date.now();
                while (notes.some(n => n.id === id)) id++;
                return id;
            }

            function applyTaskPatch(note, patch) {
                if (patch.content !== undefined) note.content = patch.content;
                if (patch.p !== undefined) note.p = patch.p;
                if (patch.type !== undefined) note.type = patch.type;
                if (patch.project !== undefined) {
                    note.project = String(patch.project || '').trim();
                    if (note.project && projects.indexOf(note.project) === -1) {
                        projects.push(note.project);
                        saveProjects();
                        refreshProjectUI();
                    }
                }
                if (patch.tags !== undefined) note.tags = patch.tags;
                if (patch.done !== undefined) {
                    note.done = !!patch.done;
                    if (note.done && !note.doneTime) note.doneTime = Date.now();
                    if (!note.done) delete note.doneTime;
                }
                if (patch.remindAt !== undefined) {
                    if (patch.remindAt) note.remindAt = patch.remindAt;
                    else delete note.remindAt;
                }
                if (patch.appendText) {
                    note.content = (note.content || '') + '<br>' + String(patch.appendText).replace(/\r?\n/g, '<br>');
                }
            }

            function findNoteAnywhere(id) {
                const note = notes.find(n => n.id === id);
                if (note) return { note: note, archived: false };
                const archived = archivedNotes.find(n => n.id === id);
                return archived ? { note: archived, archived: true } : null;
            }

            ipcRenderer.on('api:task-request', async (event, req) => {
                const op = req.op;
                const p = req.payload || {};
                const reply = (ok, data, error) =>
                    ipcRenderer.send('api:task-reply', { reqId: req.reqId, ok: ok, data: data, error: error });

                try {
                    switch (op) {
                        case 'list':
                            reply(true, { notes: notes, archived: archivedNotes });
                            break;

                        case 'get': {
                            const found = findNoteAnywhere(p.id);
                            reply(true, found ? found.note : null);
                            break;
                        }

                        case 'add': {
                            const t = p.task || {};
                            const now = Date.now();
                            const note = {
                                id: nextNoteId(),
                                content: t.content,
                                done: !!t.done,
                                p: t.p || 1,
                                type: t.type || 'short',
                                project: t.project || '',
                                comments: t.comments || [],
                                ts: now
                            };
                            if (note.project && projects.indexOf(note.project) === -1) {
                                projects.push(note.project);
                                saveProjects();
                                refreshProjectUI();
                            }
                            if (t.remindAt) note.remindAt = t.remindAt;
                            if (t.tags) note.tags = t.tags;
                            if (note.done) note.doneTime = now;
                            // top=false 时追加到末尾，默认与手动添加一致放在最前
                            if (t.top === false) notes.push(note);
                            else notes.unshift(note);
                            save();
                            reply(true, note);
                            break;
                        }

                        case 'update': {
                            const found = findNoteAnywhere(p.id);
                            if (!found) { reply(false, null, '任务不存在：' + p.id); break; }
                            applyTaskPatch(found.note, p.patch || {});
                            if (found.archived) saveArchive(); else save();
                            reply(true, found.note);
                            break;
                        }

                        case 'remove': {
                            let removed = false;
                            const before = notes.length;
                            notes = notes.filter(n => n.id !== p.id);
                            if (notes.length !== before) removed = true;
                            const ai = archivedNotes.findIndex(n => n.id === p.id);
                            if (ai !== -1) { archivedNotes.splice(ai, 1); removed = true; }
                            if (removed) { save(); saveArchive(); }
                            reply(true, { id: p.id, removed: removed });
                            break;
                        }

                        case 'comment': {
                            const found = findNoteAnywhere(p.id);
                            if (!found) { reply(false, null, '任务不存在：' + p.id); break; }
                            if (!found.note.comments) found.note.comments = [];
                            // 接口传来的文本可能带 <br> 等标签，先归一化再存
                            found.note.comments.push({ text: normalizeCommentText(p.text), time: Date.now() });
                            if (found.archived) saveArchive(); else save();
                            reply(true, found.note);
                            break;
                        }

                        default:
                            reply(false, null, '未知操作：' + op);
                    }
                } catch (err) {
                    console.error('[api] 任务操作执行失败：', err);
                    reply(false, null, err.message);
                }
            });

            // 任务到点提醒（由主进程轮询触发）
            ipcRenderer.on('task-reminder', (event, data) => {
                showAppToast('⏰ ' + (data && data.text ? data.text : '任务到点了'));
            });

            // 全局快捷键：Ctrl+Alt+N 快速记录
            ipcRenderer.on('global-shortcut', (event, data) => {
                if (data && data.action === 'quick-add') {
                    const input = document.getElementById('noteInput');
                    if (input) input.focus();
                }
            });

            // API 改设置后让界面跟着变：复用面板里已有的控件与其事件处理
            const SETTING_CONTROL_MAP = {
                timerColor: 'timerColorPicker',
                glowColor: 'glowColorPicker',
                glowIntensity: 'glowIntensitySlider',
                glowEnabled: 'glowEnabled',
                shadowColor: 'shadowColorPicker',
                shadowSize: 'shadowSizeSlider',
                darknessLevel: 'darknessSlider',
                timerVolume: 'volumeSlider',
                normalFontSize: 'normalFontSizeSlider',
                cleanFontSize: 'cleanFontSizeSlider',
                modeLabelSize: 'modeLabelSizeSlider',
                containerWidth: 'containerWidthSlider',
                floatShowTask: 'floatShowTask',
                floatShowImages: 'floatShowImages',
                floatImageLimit: 'floatImageLimit'
            };

            function applySettingViaUi(key, value) {
                const id = SETTING_CONTROL_MAP[key];
                const el = id ? document.getElementById(id) : null;
                if (!el) {
                    localStorage.setItem(key, String(value));
                    return;
                }
                if (el.type === 'checkbox') el.checked = (String(value) === 'true');
                else el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }

            ipcRenderer.on('api:apply-setting', (event, data) => {
                if (!data || data.key === undefined) return;
                try {
                    applySettingViaUi(data.key, data.value);
                } catch (e) {
                    console.warn('[api] 应用设置失败：', data.key, e.message);
                }
            });

            // ============ 设置面板：AI 接口 / 开机自启 / 快捷键 / 提醒 ============
            const apiEnabledEl = document.getElementById('apiEnabled');
            const apiPortEl = document.getElementById('apiPort');
            const apiTokenEl = document.getElementById('apiToken');
            const apiStatusEl = document.getElementById('apiStatus');
            const apiTokenRegenEl = document.getElementById('apiTokenRegen');
            const apiCopyExampleEl = document.getElementById('apiCopyExample');
            const autoLaunchEl = document.getElementById('autoLaunchToggle');
            const globalShortcutEl = document.getElementById('globalShortcutToggle');
            const reminderEl = document.getElementById('reminderToggle');

            function renderApiStatus(info) {
                if (!apiStatusEl || !info) return;
                if (info.enabled && info.running) {
                    apiStatusEl.innerHTML =
                        '接口运行中：<b>' + info.url + '/api/health</b><br>' +
                        (info.tokenRequired ? '调用需带令牌（请求头 X-Api-Token）' : '未启用令牌校验（仅限本机访问）') +
                        (info.error ? '<br><span style="color:#ef9a9a">错误：' + info.error + '</span>' : '');
                } else if (info.enabled) {
                    apiStatusEl.innerHTML = '<span style="color:#ef9a9a">接口未能启动' +
                        (info.error ? '：' + info.error : '（端口可能被占用）') + '</span>';
                } else {
                    apiStatusEl.textContent = '接口已关闭。开启后，AI / 脚本可通过本机 HTTP 接口直接注入任务与图片。';
                }
            }

            async function refreshMainSettings() {
                try {
                    const res = await ipcRenderer.invoke('main-settings:get');
                    const s = res.settings || {};
                    if (apiEnabledEl) apiEnabledEl.checked = !!(s.api && s.api.enabled);
                    if (apiPortEl) apiPortEl.value = (s.api && s.api.port) || 17890;
                    if (apiTokenEl) apiTokenEl.value = (s.api && s.api.token) || '';
                    if (autoLaunchEl) autoLaunchEl.checked = !!s.autolaunch;
                    if (globalShortcutEl) globalShortcutEl.checked = s.globalShortcuts !== false;
                    if (reminderEl) reminderEl.checked = s.reminders !== false;
                    renderApiStatus(res.api);
                } catch (e) {
                    console.error('[settings] 读取主设置失败：', e);
                }
            }

            refreshMainSettings();

            if (apiEnabledEl) {
                apiEnabledEl.onchange = async () => {
                    const res = await ipcRenderer.invoke('main-settings:set', { api: { enabled: apiEnabledEl.checked } });
                    renderApiStatus(res.api);
                    showAppToast(res.api && res.api.running ? 'AI 接口已开启' : 'AI 接口已关闭');
                };
            }
            if (apiPortEl) {
                apiPortEl.onchange = async () => {
                    const port = parseInt(apiPortEl.value, 10) || 17890;
                    const res = await ipcRenderer.invoke('main-settings:set', { api: { port: port } });
                    renderApiStatus(res.api);
                };
            }
            if (apiTokenRegenEl) {
                apiTokenRegenEl.onclick = async () => {
                    const info = await ipcRenderer.invoke('api:regenerate-token');
                    if (apiTokenEl) apiTokenEl.value = info.token || '';
                    renderApiStatus(info);
                    showAppToast('已重新生成令牌');
                };
            }
            if (apiCopyExampleEl) {
                apiCopyExampleEl.onclick = async () => {
                    try {
                        const text = await ipcRenderer.invoke('api:example');
                        const { clipboard } = require('electron');
                        clipboard.writeText(text);
                        showAppToast('调用示例已复制，可直接贴给 AI');
                    } catch (e) {
                        showAppToast('复制示例失败：' + e.message);
                    }
                };
            }
            if (autoLaunchEl) {
                autoLaunchEl.onchange = async () => {
                    await ipcRenderer.invoke('main-settings:set', { autolaunch: autoLaunchEl.checked });
                };
            }
            if (globalShortcutEl) {
                globalShortcutEl.onchange = async () => {
                    await ipcRenderer.invoke('main-settings:set', { globalShortcuts: globalShortcutEl.checked });
                };
            }
            if (reminderEl) {
                reminderEl.onchange = async () => {
                    await ipcRenderer.invoke('main-settings:set', { reminders: reminderEl.checked });
                };
            }

            // ============ WebHook 同步设置 ============
            const whEnabledEl = document.getElementById('webhookEnabled');
            const whUrlEl = document.getElementById('webhookUrl');
            const whModeEl = document.getElementById('webhookMode');
            const whSchemaJsonEl = document.getElementById('webhookSchemaJson');
            const whWecomBoxEl = document.getElementById('webhookWecomBox');
            const whFieldRowsEl = document.getElementById('webhookFieldRows');
            const whParseEl = document.getElementById('webhookParseBtn');
            const whTemplateRowEl = document.getElementById('webhookTemplateRow');
            const whTemplateEl = document.getElementById('webhookTemplate');
            const whGenericBoxEl = document.getElementById('webhookGenericBox');
            const whFieldsEl = document.getElementById('webhookFields');
            const whSaveEl = document.getElementById('webhookSaveBtn');
            const whTestEl = document.getElementById('webhookTestBtn');
            const whLogEl = document.getElementById('webhookLog');
            const whEventEls = {
                created: document.getElementById('whEvCreated'),
                updated: document.getElementById('whEvUpdated'),
                completed: document.getElementById('whEvCompleted'),
                archived: document.getElementById('whEvArchived'),
                deleted: document.getElementById('whEvDeleted')
            };

            let whSources = [];       // 可选数据源（主进程给）
            let whSchemaFields = [];  // 从示例 JSON 解析出来的表格列
            let whMapping = {};       // 字段 ID → 数据源
            let whConstants = {};     // 【2026-09-30】字段 ID → 固定文本（映射选「固定文本」时写入，如 所属项目=拯救小猫）

            function fieldsToText(fields) {
                return Object.keys(fields || {}).map(k => k + '=' + fields[k]).join('\n');
            }

            function textToFields(text) {
                const out = {};
                String(text || '').split('\n').forEach(line => {
                    const i = line.indexOf('=');
                    if (i <= 0) return;
                    const k = line.slice(0, i).trim();
                    const v = line.slice(i + 1).trim();
                    if (k) out[k] = v;
                });
                return out;
            }

            function collectWebhookEvents() {
                const events = {};
                for (const key of Object.keys(whEventEls)) {
                    events[key] = !!(whEventEls[key] && whEventEls[key].checked);
                }
                return events;
            }

            /** 按当前模式显示 / 隐藏对应设置块 */
            function updateWebhookBoxes() {
                const mode = whModeEl ? whModeEl.value : 'wecom';
                if (whWecomBoxEl) whWecomBoxEl.style.display = mode === 'wecom' ? 'block' : 'none';
                if (whTemplateRowEl) whTemplateRowEl.style.display = mode === 'custom' ? 'block' : 'none';
                if (whGenericBoxEl) {
                    whGenericBoxEl.style.display = (mode === 'records' || mode === 'flat' || mode === 'custom') ? 'block' : 'none';
                }
            }

            /** 属性值转义：字段 ID 与固定文本都可能带引号/尖括号，拼进 HTML 前必须转义 */
            function escapeAttr(s) {
                return String(s === undefined || s === null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }

            /** 每个表格列一行：列名（带选项提示）+ 固定文本输入 + 下拉框（选这条数据从哪来） */
            function renderWebhookFieldRows() {
                if (!whFieldRowsEl) return;
                if (!whSchemaFields.length) {
                    whFieldRowsEl.innerHTML = '<div style="font-size: 12px; color: #888;">还没有解析到字段。把示例 JSON 粘到上面，点「解析字段」。</div>';
                    return;
                }
                whFieldRowsEl.innerHTML = whSchemaFields.map(f => {
                    const current = whMapping[f.id] || '';
                    const options = whSources.map(s =>
                        '<option value="' + s.key + '"' + (current === s.key ? ' selected' : '') + '>' + s.label + '</option>'
                    ).join('');
                    // 【2026-09-30】把单选列的预设选项显示出来：内部值（高/未完成）与表格枚举（高优/进行中）
                    // 对不上时写入会被企业微信以 2023010 拒收，这里提前提示可选项。
                    const enumHint = Array.isArray(f.enum) && f.enum.length ? ' · 选项：' + f.enum.join(' / ') : '';
                    const constStyle = current === 'const'
                        ? 'width: 148px; padding: 4px 6px; background: #222; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 12px;'
                        : 'display: none;';
                    return '<div style="display: flex; align-items: center; gap: 6px;">' +
                        '<span style="flex: 1; min-width: 0; font-size: 12px; color: #ddd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + f.id + ' / ' + f.type + enumHint + '">' +
                        f.name + '<span style="color: #666;"> · ' + f.type + enumHint + '</span></span>' +
                        '<input type="text" class="wh-const-input" data-field-id="' + f.id + '" placeholder="固定文本" value="' + escapeAttr(whConstants[f.id] || '') + '" style="' + constStyle + '" />' +
                        '<select data-field-id="' + f.id + '" class="wh-map-select" style="width: 148px; padding: 4px 6px; background: #222; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 12px;">' +
                        options + '</select></div>';
                }).join('');
                whFieldRowsEl.querySelectorAll('.wh-map-select').forEach(sel => {
                    sel.onchange = () => {
                        const id = sel.getAttribute('data-field-id');
                        whMapping[id] = sel.value;
                        // 切到「固定文本」时把输入框露出来（切走时内容保留，方便来回切）
                        const input = whFieldRowsEl.querySelector('.wh-const-input[data-field-id="' + id + '"]');
                        if (input) input.style.display = sel.value === 'const' ? '' : 'none';
                    };
                });
                whFieldRowsEl.querySelectorAll('.wh-const-input').forEach(input => {
                    input.oninput = () => { whConstants[input.getAttribute('data-field-id')] = input.value; };
                });
            }

            function renderWebhookLog(history) {
                if (!whLogEl) return;
                if (!history || !history.length) {
                    whLogEl.textContent = '暂无推送记录。点「发送测试」验证地址与字段映射是否可用。';
                    return;
                }
                whLogEl.innerHTML = history.slice(0, 8).map(item => {
                    const t = new Date(item.time);
                    const p = n => String(n).padStart(2, '0');
                    const time = `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
                    const color = item.ok ? '#81c784' : '#ef9a9a';
                    const detail = item.ok
                        ? 'HTTP ' + item.status + ' · ' + item.count + ' 条'
                        : ('失败：' + (item.error || ('HTTP ' + item.status)));
                    return `<div>[${time}] ${item.action} <span style="color: ${color};">${detail}</span></div>`;
                }).join('');
            }

            function fillWebhookForm(data) {
                const cfg = (data && data.config) || {};
                if (data && data.sources) whSources = data.sources;
                whSchemaFields = Array.isArray(cfg.schemaFields) ? cfg.schemaFields : [];
                whMapping = Object.assign({}, cfg.mapping || {});
                whConstants = Object.assign({}, cfg.constants || {});
                if (whEnabledEl) whEnabledEl.checked = !!cfg.enabled;
                if (whUrlEl) whUrlEl.value = cfg.url || '';
                if (whModeEl) whModeEl.value = cfg.mode || 'wecom';
                if (whSchemaJsonEl && cfg.schemaJson) whSchemaJsonEl.value = cfg.schemaJson;
                if (whTemplateEl) whTemplateEl.value = cfg.template || '';
                if (whFieldsEl) whFieldsEl.value = fieldsToText(cfg.fields);
                for (const key of Object.keys(whEventEls)) {
                    const el = whEventEls[key];
                    if (el) el.checked = !!(cfg.events && cfg.events[key]);
                }
                updateWebhookBoxes();
                renderWebhookFieldRows();
            }

            async function refreshWebhook() {
                try {
                    const res = await ipcRenderer.invoke('webhook:get');
                    fillWebhookForm(res);
                    renderWebhookLog(res.history);
                } catch (e) {
                    console.error('[webhook] 读取配置失败：', e);
                }
            }

            refreshWebhook();

            if (whModeEl) whModeEl.onchange = updateWebhookBoxes;

            if (whEnabledEl) {
                whEnabledEl.onchange = async () => {
                    const res = await ipcRenderer.invoke('webhook:set', { enabled: whEnabledEl.checked });
                    fillWebhookForm(res);
                    showAppToast(whEnabledEl.checked ? '已开启同步' : '已关闭同步');
                };
            }

            if (whParseEl) {
                whParseEl.onclick = async () => {
                    const text = whSchemaJsonEl ? whSchemaJsonEl.value.trim() : '';
                    if (!text) {
                        showAppToast('先粘贴「接收外部数据」页面里的示例 JSON');
                        return;
                    }
                    const res = await ipcRenderer.invoke('webhook:set', { parseSchemaOnly: text });
                    const count = res.config.schemaFields ? res.config.schemaFields.length : 0;
                    if (!count) {
                        showAppToast('没解析出字段，请确认粘的是示例 JSON');
                        return;
                    }
                    fillWebhookForm(res);
                    showAppToast('解析到 ' + count + ' 个字段，已自动匹配，请核对下面每一项');
                };
            }

            /** 保存当前表单（推送前也先存一遍，避免测的是旧配置） */
            async function saveWebhookForm() {
                return await ipcRenderer.invoke('webhook:set', {
                    url: whUrlEl ? whUrlEl.value : '',
                    mode: whModeEl ? whModeEl.value : 'wecom',
                    template: whTemplateEl ? whTemplateEl.value : '',
                    events: collectWebhookEvents(),
                    fields: textToFields(whFieldsEl ? whFieldsEl.value : ''),
                    mapping: whMapping,
                    constants: whConstants
                });
            }

            if (whSaveEl) {
                whSaveEl.onclick = async () => {
                    const res = await saveWebhookForm();
                    fillWebhookForm(res);
                    renderWebhookLog(res.history);
                    showAppToast('WebHook 设置已保存');
                };
            }

            if (whTestEl) {
                whTestEl.onclick = async () => {
                    await saveWebhookForm();
                    const res = await ipcRenderer.invoke('webhook:test');
                    if (res && res.ok) {
                        showAppToast('测试成功：表格里应该多了一条测试记录');
                    } else {
                        const detail = (res && res.json && res.json.errmsg) || (res && res.body) || '未知错误';
                        showAppToast('测试失败：' + String(detail).slice(0, 90));
                    }
                    const latest = await ipcRenderer.invoke('webhook:get');
                    renderWebhookLog(latest.history);
                };
            }

            // 主进程推送完成后刷新记录
            ipcRenderer.on('webhook:log', () => {
                ipcRenderer.invoke('webhook:get').then(res => renderWebhookLog(res.history));
            });

            // ============ 全局搜索（M14-5） ============
            const searchInputEl = document.getElementById('searchInput');
            const searchClearEl = document.getElementById('searchClearBtn');

            function applySearch() {
                render(true);
                if (currentView === 'table') renderTable(true);
                if (isArchiveExpanded) renderArchiveHistory();
            }

            if (searchInputEl) {
                searchInputEl.addEventListener('input', () => {
                    searchKeyword = searchInputEl.value.trim().toLowerCase();
                    applySearch();
                });
            }
            if (searchClearEl) {
                searchClearEl.onclick = () => {
                    if (searchInputEl) searchInputEl.value = '';
                    searchKeyword = '';
                    applySearch();
                };
            }
        }

        // ==================== 项目分类：选择器 / 管理器（2026-10-20） ====================

        function setProjectOnNote(note, value) {
            if (!note) return;
            const name = value || '';
            if (name && projects.indexOf(name) === -1) {
                projects.push(name);
                saveProjects();
            }
            note.project = name;
            refreshProjectUI();
            if (archivedNotes.indexOf(note) !== -1) saveArchive();
            else save();
            if (currentView === 'table') renderTable(true);
            showAppToast('已归入「' + projectLabelOf(name) + '」');
        }

        window.setNoteProject = (id) => {
            const note = notes.find(x => x.id === id) || archivedNotes.find(x => x.id === id);
            if (!note) return;

            const old = document.getElementById('projectPickerOverlay');
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.id = 'projectPickerOverlay';
            overlay.className = 'project-picker-overlay';
            const box = document.createElement('div');
            box.className = 'project-picker-box';
            box.innerHTML =
                '<div class="project-picker-title">📁 归入项目</div>' +
                '<div id="projectPickerList"></div>' +
                '<div class="project-picker-actions">' +
                '<button id="ppManage" class="project-mini-btn" style="margin-right:auto;">管理项目…</button>' +
                '<button id="ppCancel" class="project-mini-btn" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2);color:#ccc;">取消</button>' +
                '</div>';
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const list = box.querySelector('#projectPickerList');
            const addItem = (value, label) => {
                const btn = document.createElement('button');
                btn.className = 'project-picker-item' + ((projectNameOf(note) || '') === value ? ' active' : '');
                btn.textContent = label;
                btn.onclick = () => {
                    setProjectOnNote(note, value);
                    overlay.remove();
                };
                list.appendChild(btn);
            };
            addItem('', '未分类');
            projects.forEach(p => addItem(p, p));

            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            box.querySelector('#ppCancel').onclick = () => overlay.remove();
            box.querySelector('#ppManage').onclick = () => {
                overlay.remove();
                openProjectManager(false);
            };
        };

        /** 项目管理：新建 / 重命名 / 删除。重命名与删除会同步更新所有任务。 */
        function openProjectManager(focusAdd, onCreated) {
            const old = document.getElementById('projectManagerOverlay');
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.id = 'projectManagerOverlay';
            overlay.className = 'project-picker-overlay';
            const box = document.createElement('div');
            box.className = 'project-picker-box';
            box.innerHTML =
                '<div class="project-picker-title">📁 项目管理</div>' +
                '<div class="project-manager-hint">任务可以归入不同项目，用于跨项目的归类、筛选与分组显示。重命名 / 删除项目会同步更新已有任务。</div>' +
                '<div id="projectManagerList"></div>' +
                '<div class="project-manager-row" style="margin-top:14px;">' +
                '<input id="pmNewName" type="text" placeholder="新项目名称，例如：官网改版" maxlength="30">' +
                '<button id="pmAddBtn" class="project-mini-btn">＋ 添加</button>' +
                '</div>' +
                '<div class="project-picker-actions">' +
                '<button id="pmDoneBtn" class="project-mini-btn" style="background:rgba(76,175,80,0.18);border-color:rgba(76,175,80,0.5);color:#a5d6a7;">完成</button>' +
                '</div>';
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const list = box.querySelector('#projectManagerList');
            const newInput = box.querySelector('#pmNewName');

            function refreshAllViews() {
                refreshProjectUI();
                render(true);
                if (currentView === 'table') renderTable(true);
                if (isArchiveExpanded) renderArchiveHistory();
            }

            function renderRows() {
                list.innerHTML = '';
                if (projects.length === 0) {
                    list.innerHTML = '<div class="project-manager-hint">还没有项目。在下面输入名称后点「添加」。</div>';
                    return;
                }
                projects.forEach(name => {
                    const matches = n => (n.project || '') === name;
                    const row = document.createElement('div');
                    row.className = 'project-manager-row';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = name;
                    input.maxLength = 30;
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = '保存改名';
                    saveBtn.onclick = () => {
                        const next = input.value.trim();
                        if (!next) return showAppToast('项目名称不能为空');
                        if (next === name) return;
                        if (projects.indexOf(next) !== -1) return showAppToast('已经有同名项目了');
                        notes.forEach(n => { if (matches(n)) n.project = next; });
                        archivedNotes.forEach(n => { if (matches(n)) n.project = next; });
                        projects[projects.indexOf(name)] = next;
                        // 记住的项目跟着改名，否则下次启动还原不到
                        if (lastNoteProject === name) {
                            lastNoteProject = next;
                            localStorage.setItem('lastNoteProject', next);
                        }
                        saveProjects();
                        save();
                        saveArchive();
                        refreshAllViews();
                        renderRows();
                        showAppToast('已重命名为「' + next + '」');
                    };
                    const delBtn = document.createElement('button');
                    delBtn.className = 'danger';
                    delBtn.textContent = '删除';
                    delBtn.onclick = () => {
                        if (!confirm('删除项目「' + name + '」？\n该项目下的任务会变成「未分类」，任务本身不会被删除。')) return;
                        projects = projects.filter(p => p !== name);
                        if (lastNoteProject === name) {
                            lastNoteProject = '';
                            localStorage.setItem('lastNoteProject', '');
                        }
                        notes.forEach(n => { if (matches(n)) n.project = ''; });
                        archivedNotes.forEach(n => { if (matches(n)) n.project = ''; });
                        saveProjects();
                        save();
                        saveArchive();
                        refreshAllViews();
                        renderRows();
                        showAppToast('项目已删除，任务已转为未分类');
                    };
                    row.appendChild(input);
                    row.appendChild(saveBtn);
                    row.appendChild(delBtn);
                    list.appendChild(row);
                });
            }

            // 闭包里的旧名字比较，直接读 note.project

            function addProject() {
                const name = newInput.value.trim();
                if (!name) return showAppToast('先输入项目名称');
                if (projects.indexOf(name) !== -1) return showAppToast('已经有同名项目了');
                projects.push(name);
                saveProjects();
                newInput.value = '';
                refreshAllViews();
                renderRows();
                showAppToast('已添加项目「' + name + '」');
                newInput.focus();
                // 从「＋ 新建 / 新建项目」进来的，新建完直接把下拉切到新项目，
                // 免得建完还要再点一次，看起来像「按钮没作用」
                if (typeof onCreated === 'function') {
                    try { onCreated(name); } catch (e) { console.warn('onCreated 失败:', e); }
                }
            }

            box.querySelector('#pmAddBtn').onclick = addProject;
            newInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); addProject(); }
            });
            box.querySelector('#pmDoneBtn').onclick = () => overlay.remove();
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            renderRows();
            if (focusAdd) setTimeout(() => newInput.focus(), 60);
        }

        // 提醒时间：卡片上的 ⏰ 徽标点击后也可设置 / 清除
        window.setReminder = (id) => {
            const note = notes.find(x => x.id === id) || archivedNotes.find(x => x.id === id);
            if (!note) return;
            openReminderPicker(note.remindAt).then(result => {
                if (result === null) return; // 取消
                if (result === '') {
                    delete note.remindAt;
                    showAppToast('已清除提醒');
                } else {
                    note.remindAt = result;
                    showAppToast('已设置提醒：' + formatDate(result));
                }
                if (archivedNotes.indexOf(note) !== -1) saveArchive();
                else save();
            });
        };

        // ==================== 多端同步集成（focus-timer sync） ====================
        // 通过 window.createSync(deps) 注入渲染端依赖，不改动任何原有任务逻辑：
        //  · 任务增删改都会经过 save() / saveArchive()，已在下方挂脏标记触发推送；
        //  · 拉取到的远端变更由 applyRemote 合并回 notes / archivedNotes 并重绘；
        //  · 同一任务两端都改过 → 弹窗询问「保留我的 / 保留对方的 / 都保留」。
        if (window.createSync) {
            var __sync = window.createSync({
                getLocalTasks: function () { return notes.concat(archivedNotes); },
                applyRemote: function (upserts, deletes) {
                    upserts.forEach(function (u) {
                        var t = u.task; var key = String(t.id);
                        notes = notes.filter(function (n) { return String(n.id) !== key; });
                        archivedNotes = archivedNotes.filter(function (n) { return String(n.id) !== key; });
                        if (t.done) archivedNotes.push(t); else notes.push(t);
                    });
                    deletes.forEach(function (d) {
                        var key = String(d.taskId);
                        notes = notes.filter(function (n) { return String(n.id) !== key; });
                        archivedNotes = archivedNotes.filter(function (n) { return String(n.id) !== key; });
                    });
                    try {
                        localStorage.setItem('notes', JSON.stringify(notes));
                        localStorage.setItem('archived_notes', JSON.stringify(archivedNotes));
                    } catch (e) {}
                    render(true);
                    if (typeof renderTable === 'function' && currentView === 'table') renderTable(true);
                },
                toast: function (msg) { if (typeof showAppToast === 'function') showAppToast(msg); else console.log('[sync] ' + msg); }
            });
            window.__SYNC__ = __sync;
            var __origSave = save;
            save = function () { __origSave.apply(null, arguments); if (window.__SYNC__) window.__SYNC__.notifyLocalChange(); };
            var __origSaveArchive = saveArchive;
            saveArchive = function () { __origSaveArchive.apply(null, arguments); if (window.__SYNC__) window.__SYNC__.notifyLocalChange(); };
            __sync.init();
        }
