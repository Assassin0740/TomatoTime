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
            '70676dd28cc011f0518f0ca513383413546769371695776.jpg@536w_536h_1c_1s.webp',
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

        /** 纯文本匹配：任务正文 + 评论一起搜，忽略 HTML 标签 */
        function matchKeyword(note, keyword) {
            if (!keyword) return true;
            let text = String(note.content || '').replace(/<[^>]*>/g, ' ');
            if (note.comments && note.comments.length) {
                text += ' ' + note.comments.map(c => (c && c.text) || '').join(' ');
            }
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

        // 懒加载 HTML 中的图片
        function lazyloadifyHtml(htmlContent) {
            if (!htmlContent) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const imgs = tempDiv.getElementsByTagName('img');
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                const src = img.src || img.getAttribute('src');
                
                // 统一为图片绑定微信风格大图浏览器拉起逻辑，点击即可放大，解决“照片点不了”的问题！
                img.setAttribute('onclick', `zoomImage(event, this.dataset.src || this.src)`);
                img.style.cursor = 'pointer';
                img.title = '点击放大图片';

                // 核心性能策略：如果图片本身就是内联 Base64 数据（直接存储在本地内存中），或者已经在已加载缓存中，
                // 则坚决不走懒加载流程，直接渲染输出真实图片，100% 避开 SVG 占位图的过渡，彻底解决闪烁与白屏！
                if (src && (src.startsWith('data:image/') || loadedImageUrls.has(src))) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy-img');
                    continue;
                }

                if (src && !src.startsWith('data:image/svg+xml')) {
                    img.setAttribute('data-src', src);
                    img.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==";
                    img.classList.add('lazy-img');
                }
            }
            return tempDiv.innerHTML;
        }

        // 卡片分页加载状态
        let cardRenderLimit = 15;
        let tableRenderLimit = 30;
        let renderedCardCount = 0;
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
        function triggerImageGarbageCollection() {
            if (gcTimeout) clearTimeout(gcTimeout);
            gcTimeout = setTimeout(async () => {
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

            // 增量范围：从已渲染的 renderedCardCount 到当前加载上限 cardRenderLimit
            const start = renderedCardCount;
            const end = Math.min(filtered.length, cardRenderLimit);
            
            if (start < end) {
                const toRender = filtered.slice(start, end);

                toRender.forEach(n => {
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
                const contentHtml = lazyloadifyHtml(n.content);

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
                
                let bodyContent = n.content;
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

            // 限制拖动范围算法，防止图片边缘缩入视口
            function calculateDragLimit(scale) {
                const imgW = imgContainer.clientWidth * scale;
                const imgH = imgContainer.clientHeight * scale;
                const viewW = viewport.clientWidth;
                const viewH = viewport.clientHeight;

                const limitX = Math.max(0, (imgW - viewW) / 2);
                const limitY = Math.max(0, (imgH - viewH) / 2);
                return { x: limitX, y: limitY };
            }

            function bindEvents() {
                // 1. 双击与拖拽
                viewport.addEventListener('mousedown', function(e) {
                    if (isEditing) return;
                    if (e.button === 0) { // 左键拖拽
                        isDragging = true;
                        startDragPos = { x: e.clientX, y: e.clientY };
                        startTranslate = { ...currentTranslate };
                        
                        // 长按判定
                        isPressing = true;
                        clearTimeout(pressTimer);
                        pressTimer = setTimeout(() => {
                            if (isPressing && !isDragging) {
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
                    if (!isDragging || isEditing) return;
                    const dx = e.clientX - startDragPos.x;
                    const dy = e.clientY - startDragPos.y;

                    // 如果发生了明显位移，取消长按
                    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                        isPressing = false;
                    }

                    if (currentScale > 1) {
                        let tx = startTranslate.x + dx;
                        let ty = startTranslate.y + dy;

                        // 限制边界
                        const limit = calculateDragLimit(currentScale);
                        tx = Math.max(-limit.x, Math.min(limit.x, tx));
                        ty = Math.max(-limit.y, Math.min(limit.y, ty));

                        currentTranslate = { x: tx, y: ty };
                        imgContainer.style.transform = `translate(${tx}px, ${ty}px) scale(${currentScale})`;
                    }
                });

                window.addEventListener('mouseup', function() {
                    isDragging = false;
                    isPressing = false;
                    clearTimeout(pressTimer);
                });

                // 点击视口外部（即视口上的空白背景）关闭预览
                viewport.addEventListener('click', function(e) {
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
                        imgContainer.style.transform = 'translate(0px, 0px) scale(1)';
                        currentScale = 1;
                        currentTranslate = { x: 0, y: 0 };
                    } else {
                        // 放大
                        const rect = imgContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left - rect.width / 2;
                        const clickY = e.clientY - rect.top - rect.height / 2;
                        
                        currentScale = 2.5;
                        let tx = -clickX * (currentScale - 1);
                        let ty = -clickY * (currentScale - 1);

                        const limit = calculateDragLimit(currentScale);
                        tx = Math.max(-limit.x, Math.min(limit.x, tx));
                        ty = Math.max(-limit.y, Math.min(limit.y, ty));

                        currentTranslate = { x: tx, y: ty };
                        imgContainer.style.transform = `translate(${tx}px, ${ty}px) scale(${currentScale})`;
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
                    imgContainer.style.transform = 'translate(0px, 0px) scale(1)';
                    currentScale = 1;
                    currentTranslate = { x: 0, y: 0 };
                    
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

                modalImg.src = src;
                currentScale = 1;
                currentTranslate = { x: 0, y: 0 };
                imgContainer.style.transform = 'translate(0px, 0px) scale(1)';

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

        /** 任意图片地址 → 本库文件 URL（file:// 会先入库，避免原文件被清理后裂图） */
        async function localizeImageSrc(src) {
            if (!src) return null;
            if (/^data:image/.test(src)) {
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
                    n.content = editable.innerHTML;
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

        function extractImgSrcs(html) {
            const out = [];
            if (!html) return out;
            const div = document.createElement('div');
            div.innerHTML = html;
            div.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src) out.push(src);
            });
            return out;
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

        // 给任务设置提醒时间（M14-3）
        document.getElementById('remindTaskItem').onclick = () => {
            const editable = currentEditableElement;
            document.getElementById('contextMenu').classList.remove('show');
            if (!editable) return;
            const noteId = noteIdOfEditable(editable);
            const note = notes.find(x => x.id === noteId) || archivedNotes.find(x => x.id === noteId);
            if (!note) return;
            const current = note.remindAt ? formatDateInput(note.remindAt) : '';
            const input = prompt('设置提醒时间（格式 2026-09-28 18:00，留空则清除提醒）', current);
            if (input === null) return;
            const text = String(input).trim();
            if (!text) {
                delete note.remindAt;
                showAppToast('已清除提醒');
            } else {
                const ts = new Date(text.replace(' ', 'T')).getTime();
                if (isNaN(ts)) {
                    showAppToast('时间格式无法识别，示例：2026-09-28 18:00');
                    return;
                }
                note.remindAt = ts;
                showAppToast('已设置提醒：' + formatDate(ts));
            }
            if (archivedNotes.indexOf(note) !== -1) {
                saveArchive();
            } else {
                save();
            }
        };

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
         * 粘贴事件：三级兜底，保证「微信 ↔ 本应用」双向都能粘图
         *   ① 剪贴板带文件（截图工具、资源管理器复制的图片文件）
         *   ② 剪贴板带 HTML（Word / 网页 / 部分聊天软件会给 <img src="file://…">）
         *   ③ 剪贴板只有位图（微信截图最常见）—— 网页事件里一个条目都拿不到，
         *      只能由主进程直接从系统剪贴板读取
         */
        document.addEventListener('paste', async (e) => {
            const target = e.target;
            const editable = target.closest('.note-content-editable, .table-content, .note-input');
            if (!editable) return;

            const cd = e.clipboardData;

            // ① 文件
            if (cd && cd.files && cd.files.length > 0) {
                let handled = false;
                for (const file of Array.from(cd.files)) {
                    if (!file.type || !file.type.startsWith('image/')) continue;
                    e.preventDefault();
                    handled = true;
                    const dataUrl = await fileToDataUrl(file);
                    if (!dataUrl) continue;
                    const fileUrl = await localizeImageSrc(dataUrl);
                    insertImageIntoEditable(editable, fileUrl);
                    persistEditable(editable);
                }
                if (handled) {
                    showAppToast('图片已粘贴');
                    return;
                }
            }

            // ② HTML 里夹带的图片
            if (cd) {
                const html = cd.getData('text/html');
                const srcs = extractImgSrcs(html);
                if (srcs.length > 0) {
                    e.preventDefault();
                    let inserted = 0;
                    for (const src of srcs) {
                        const fileUrl = await localizeImageSrc(src);
                        if (!fileUrl) continue;
                        insertImageIntoEditable(editable, fileUrl);
                        inserted++;
                    }
                    if (inserted > 0) {
                        persistEditable(editable);
                        showAppToast('图片已粘贴');
                        return;
                    }
                }
            }

            // ③ 纯位图（微信 / Win+Shift+S）
            const hasText = cd ? !!cd.getData('text/plain') : false;
            if (!hasText) {
                const ok = await pasteImageIntoEditable(editable);
                if (ok) {
                    e.preventDefault();
                    showAppToast('图片已粘贴');
                    return;
                }
            }

            // 文本：输入框一律按纯文本粘贴，避免把外部样式带进任务里
            if (editable.id === 'noteInput' && cd) {
                const text = cd.getData('text/plain');
                if (text) {
                    e.preventDefault();
                    document.execCommand('insertText', false, text);
                }
            }
        });

        // Ctrl+C 选中的是图片时直接把位图写进系统剪贴板；
        // 否则默认只复制一段 <img src="file://…"> 的 HTML，微信等外部软件根本用不了
        document.addEventListener('copy', (e) => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
            const editable = e.target.closest && e.target.closest('.note-content-editable, .table-content, .note-input');
            if (!editable) return;
            if (String(sel).trim()) return; // 有文字就交给默认逻辑

            let imgs = [];
            try {
                const frag = sel.getRangeAt(0).cloneContents();
                imgs = Array.from(frag.querySelectorAll ? frag.querySelectorAll('img') : []);
            } catch (err) {
                return;
            }
            if (imgs.length === 0) return;
            e.preventDefault();
            copyImageToSystemClipboard(resolveImgSrc(imgs[0]), 'bitmap');
        });


        function updateNoteContent(editable) {
            const noteId = parseInt(editable.getAttribute('data-note-id'));
            if (!isNaN(noteId)) {
                const note = notes.find(n => n.id === noteId);
                if (note) {
                    note.content = editable.innerHTML;
                    save();
                }
            }
        }
        
        function updateTableNote(noteId, editable) {
            const note = notes.find(n => n.id === noteId);
            if (note) {
                note.content = editable.innerHTML;
                save();
            }
        }
        
        function handleTableNoteKeydown(e) {
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

        function renderCommentText(text) {
            const escaped = escapeHtml(text);
            return escaped.replace(/\[img\](.*?)\[\/img\]/g, '<img src="表情包/$1" style="width: 100px; height: 100px; object-fit: cover; vertical-align: middle; border-radius: 8px;">');
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

        window.addComment = id => {
            const input = document.getElementById('c_' + id);
            let text = '';
            if (input) {
                const children = input.childNodes;
                children.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        text += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'IMG') {
                        const src = child.src;
                        const imgName = src.split('/').pop();
                        text += `[img]${imgName}[/img]`;
                    }
                });
                text = text.trim();
                if (!text) return;
                
                getTaskAndSave(id, n => {
                    if (!n.comments) n.comments = [];
                    n.comments.push({ text: text, time: Date.now() });
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

        window.toggleEmojiPanel = (noteId) => {
            const panel = document.getElementById(`emoji_${noteId}`);
            panel.classList.toggle('show');
        };

        window.insertEmoji = (inputId, noteId, imgName) => {
            const input = document.getElementById(inputId);
            const panel = document.getElementById(`emoji_${noteId}`);

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

            panel.classList.remove('show');
        };

        function updateInputPlaceholder(el) {
            if (!el.innerText.trim() && el.querySelectorAll('img').length === 0) {
                el.setAttribute('data-has-content', 'false');
            } else {
                el.setAttribute('data-has-content', 'true');
            }
        }

        window.handleNoteKeydown = (e) => {
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
            notes.unshift({
                id: Date.now(),
                content: c,
                done: false,
                p: currentPriority,
                type: currentType,
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

        // 处理输入框回车添加笔记
        document.getElementById('noteInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('addNoteBtn').click();
            }
        });

        document.getElementById('exportBtn').onclick = () => {
            const a = document.createElement('a');
            const exportData = {
                notes: notes,
                archived_notes: archivedNotes
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

        // 关于页版本号：桌面版问主进程要；拿不到（网页版）就显示网页版字样
        (async () => {
            const el = document.getElementById('aboutVersion');
            if (!el) return;
            let version = '';
            try { version = await ipcRenderer.invoke('app:version'); } catch (e) { version = ''; }
            el.dataset.version = version || '';
            el.innerHTML = version
                ? `专注计时器 <b>v${version}</b>（桌面版）`
                : '专注计时器（网页版，数据保存在本机浏览器）';
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
        function updateGlowEffect() {
            const timeEl = document.querySelector('.time');
            const glowToggle = document.getElementById('glowEnabled');
            if (!timeEl || !glowToggle) return;
            if (glowToggle.checked) {
                const color = document.getElementById('glowColorPicker').value;
                const intensity = document.getElementById('glowIntensitySlider').value;
                timeEl.style.textShadow = `0 0 ${intensity}px ${color}, 0 0 ${intensity * 2}px ${color}`;
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
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 20px;">暂无任务</td></tr>';
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

                // 快捷评论框
                let commentInputHtml = `
                    <div class="comment-input-area" id="tableCommentArea_${n.id}" style="display:none; margin-top:8px; padding:6px; background:rgba(0,0,0,0.25); border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
                        <div class="comment-input-wrapper" style="margin-bottom: 5px;">
                            <div class="comment-input" id="tc_${n.id}" contenteditable="true" data-placeholder="添加批注…" onkeydown="handleTableCommentKeydown(event, ${n.id})" style="min-height: 24px; font-size:12px; color:#fff; outline:none; text-align: left; background:transparent;"></div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 5px;">
                            <button onclick="addTableComment(${n.id})" style="font-size:11px; padding: 3px 8px; background:#4CAF50; border:none; color:#fff; border-radius:4px; cursor:pointer;">发送</button>
                        </div>
                    </div>
                `;
                
                const rowInnerHtml = `
                    <td style="text-align: left; vertical-align: top;">
                        <div class="table-content" contenteditable="true" onblur="updateTableNote(${n.id}, this)" onkeydown="handleTableNoteKeydown(event)" title="点击编辑任务内容" style="outline: none; color: #fff; line-height: 1.5;">${lazyloadifyHtml(n.content)}</div>
                        ${commentsHtml}
                        ${commentInputHtml}
                    </td>
                    <td style="vertical-align: middle;"><span style="background:${pColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;cursor:pointer" onclick="togglePriority(${n.id});renderTable();" title="点击切换优先级">${pText}</span></td>
                    <td style="vertical-align: middle;"><span style="background:${typeColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;cursor:pointer" onclick="toggleType(${n.id});renderTable();" title="点击切换类型">${typeText}</span></td>
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
            const text = input.textContent.trim();
            if (!text) return;
            
            getTaskAndSave(id, n => {
                if (!n.comments) n.comments = [];
                n.comments.push({ text: text, time: Date.now() });
            });
            
            renderTable();
        };

        window.updateTableNote = (noteId, element) => {
            getTaskAndSave(noteId, n => {
                const newContent = element.innerHTML.trim();
                if (newContent && newContent !== n.content) {
                    n.content = newContent;
                } else if (!newContent) {
                    element.innerHTML = n.content;
                }
            });
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
                                comments: t.comments || [],
                                ts: now
                            };
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
                            found.note.comments.push({ text: String(p.text), time: Date.now() });
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

        // 提醒时间：卡片上的 ⏰ 徽标点击后也可设置 / 清除
        window.setReminder = (id) => {
            const note = notes.find(x => x.id === id) || archivedNotes.find(x => x.id === id);
            if (!note) return;
            const current = note.remindAt ? formatDateInput(note.remindAt) : '';
            const input = prompt('设置提醒时间（格式 2026-09-28 18:00，留空则清除提醒）', current);
            if (input === null) return;
            const text = String(input).trim();
            if (!text) {
                delete note.remindAt;
                showAppToast('已清除提醒');
            } else {
                const ts = new Date(text.replace(' ', 'T')).getTime();
                if (isNaN(ts)) {
                    showAppToast('时间格式无法识别，示例：2026-09-28 18:00');
                    return;
                }
                note.remindAt = ts;
                showAppToast('已设置提醒：' + formatDate(ts));
            }
            if (archivedNotes.indexOf(note) !== -1) saveArchive();
            else save();
        };
