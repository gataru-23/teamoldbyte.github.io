/** workbook/edit_workbook.html
 * @author LGM
 */
function pageinit(workbookId, workbookCover, helloBook, passageIdList, sampleCount) {
	$('#loadingModal').modal('hide');
	// 모바일 툴팁 (워크북 타입)
	if(document.querySelector('.type-tooltip')) {
		const typeTooltip = new bootstrap.Tooltip(document.querySelector('.type-tooltip'),{trigger:'hover focus'});
		typeTooltip.enable();
	}
	// 모바일 툴팁 (답변 우선권)
	if(document.querySelector('.priority-tooltip')) {
		const priorityTooltip = new bootstrap.Tooltip(document.querySelector('.priority-tooltip'),{trigger:'hover focus'});
		priorityTooltip.enable();
	}
	   
	// 지문 등록 버튼 툴팁, 페이지 진입시 자동 표시 
	if(document.querySelector('.js-add-passage-open')) {
		$('.js-add-passage-open').tooltip('show');
		const $addPsgIndicator = $('#addPsgIndicator');
		const addPsgBtnScrollObserver = new IntersectionObserver((entries) => {
			if(entries[0].intersectionRect.height == 0 && entries[0].boundingClientRect.y > 0) {
				$addPsgIndicator.addClass('bottom-0');
				$addPsgIndicator.removeClass('top-0');
				$addPsgIndicator.show();
			}else{
				$addPsgIndicator.hide();
			}
		}, {rootMargin: '35px 0px'});
		addPsgBtnScrollObserver.observe($('.js-add-passage-open')[0]);
	}
	
	
	Compressor.setDefaults({quality: 0.8, width: 210, height: 315, maxWidth: 210, maxHeight: 315, resize: 'cover'});
	// [워크북 개요의 지문 레이아웃 정렬]--------------------------------------------
	$('.workbook-overview-section .list-passage-section').masonry({
		// options
		itemSelector: '.passage',
		columnWidth: '.passage',
		gutter: 10,
		percentPosition: true,
		horizontalOrder: true,
		// slow transitions
		transitionDuration: '0.8s'
	});
	
	if(!helloBook) {
	// [커버 이미지 미리보기 변경]-----------------------------------------------------------
	let $imgPreview = $('.workbook-info-section .book-cover img');
	$('[name="coverImage"]').on('change', function(e) {
		let file = e.target.files[0];
		if(file == null) return false;
		
		const reader = new FileReader();
		reader.onload = function() {
			$imgPreview.css('background-image','url(' + this.result + ')')
			.closest('.book-cover').removeClass('default').find('.book-title').hide();
			URL.revokeObjectURL(reader.result);
		}
		new Compressor(file, {
			success(result) {
				reader.readAsDataURL(result);
			},
			error(err) {
				reader.readAsDataURL(file);
			}
		});
	});
	
	// 편집 입력칸 클릭 시 수정 활성화 및 버튼 표시
	$(document).on('focus click', '.edit-hover:not(.active) *', function(e) {
		e.stopImmediatePropagation();
		e.stopPropagation();
		const $block = $(this.closest('.edit-hover'));
		const $input = $block.find('input,select,textarea');
		$block.addClass('active');
		if($input.is(':file')) {
			$input.data('originData', $imgPreview.css('background-image'));
			$block.find('.mdf-btns').css('display', 'block');
		}else {
			$input.prop('readonly', false);
			$input.data('originData', $input.is(':radio')
									? $input.filter(':checked').val() : $input.val());
			
			$block.find('.mdf-btns').show();
		}
		$block.find('.edit-badge').hide();
	});
	// [수정 취소 및 비활성화]-------------------------------------------------------
	$('.js-edit-cancel').click(function(e) {
		e.stopPropagation();
		const $block = $(this.closest('.edit-hover'));
		const $input = $block.find('input,select,textarea');
		
		if($input.is(':file')) {// 커버이미지는 원래이미지로 복구
			$imgPreview.css('background-image', $input.data('originData'));
			if($input.data('originData') == 'none') {
				$imgPreview
				.closest('.book-cover').addClass('default').find('.book-title').show();
			}
		}else {
			if($input.is(':radio')) {
				$input.filter('[value="'+$input.data('originData')+'"]').prop('checked', true);
			}else {
				$input.val($input.data('originData'));
			}
			$input.prop('readonly', true);
		}
		$block.removeClass('active').find('.edit-badge').show().removeAttr('style');
		$block.find('.mdf-btns').hide().find('button').not(this).prop('disabled', true);
	});
	
	// [입력 내용이 있으면 수정 확인 버튼 활성화]----------------------------------------
	$('.edit-hover input, .edit-hover select, .edit-hover textarea').on('input', function() {
		$(this.closest('.edit-hover')).find('.mdf-btns button').prop('disabled', false);
	});
	
	// [워크북 내용 수정]-------------------------------------------------------
	$('.edit-workbook-form').submit(function(e) {
		e.preventDefault();
		const $input = $(this).find('input,select,textarea');
		const $block = $input.closest('.edit-hover');
		const form = this;
		if($input.is(':file')) {
			const command = new FormData();
			command.append('workBookId', workbookId);
			new Compressor($input.get(0).files[0], {
				success(result) {
					command.append($input.attr('name'), result, result.name);
					// 워크북 정보 수정(ajax)--------------------------------
					editWorkbookMultiInfo(form.action, command, successEdit);
					//---------------------------------------------------
				},
				error(err) {
					command.append($input.attr('name'), $input.get(0).files[0]);
					// 워크북 정보 수정(ajax)--------------------------------
					editWorkbookMultiInfo(form.action, command, successEdit);
					//---------------------------------------------------
				}
			})
		}else {
			const command = {workBookId: workbookId};
			command[$input.attr('name')] = $input.is(':radio')
											? ($input.filter(':checked').val() == 'true')
											: $input.val().trim();
			
			// 워크북 정보 수정(ajax)--------------------------------
			editWorkbookPlainInfo(form.action, command, successEdit);
			//---------------------------------------------------
		}
		
		function successEdit() {
			alertModal('수정되었습니다.');
			
			$block.removeClass('active').find('.edit-badge').show().removeAttr('style');
			$block.find('.mdf-btns').hide()
				.find('button:not(.js-edit-cancel)').prop('disabled', true);
			$('.update-date').text(new Date().toLocaleDateString());
		}
	});
	}
	// [지문 추가 조회]------------------------------------------------------------
	const scrollObserver = new IntersectionObserver((entries) => {
		if(entries[0].isIntersecting) {
			const pageNum = entries[0].target.dataset.pagenum;
			// 지문 추가 조회(ajax)------------------------------------------------
			$.getJSON(`/workbook/passages/${workbookId}`, { pageNum },
					successGetPassages).fail((jqXHR, status, err)=>
					
					alertModal('지문 조회에 실패했습니다. 다시 접속해주세요.'));
			//------------------------------------------------------------------
		}
	});
	const pageScroller = document.querySelector('.page-scroll');
	scrollObserver.observe(pageScroller);
	function successGetPassages(passages) {
		const $passageList = $('.list-passage-section');
		if(passages != null && passages.content?.length > 0) {
			for(let i = 0, len = passages.content?.length; i < len; i++) {
				const $passage = $('#hiddenDivs .passage').clone();
				const passage = passages.content[i];
				// passageId
				$passage.attr('data-pid', passage.passageId);
				
				// title
				if(helloBook)
					$passage.find('.passage-title').text(new Date(passage.regDate).format('yyyy-MM-dd(e)'))
												.attr('title', new Date(passage.regDate).format('yyyy-MM-dd(e)'));
				else 
					$passage.find('.passage-title').text(passage.title||'제목 없음')
													.attr('title', passage.title||'제목 없음');
				$passage.find('.passage-title-section .title-input').val(passage.title);
				
				// sample
				if(passage.sample) $passage.addClass('sample');
				
				// sentenceList
				const $texts = $passage.find('.passage-text');
				const sentences = passage.sentenceList;
				for(let j = 0, len2 = sentences.length; j < len2; j++) {
					$texts.append(sentences[j].eng);
				}
				$passageList.append($passage).masonry('appended', $passage);
			}
			if(passages.last) scrollObserver.disconnect();
			pageScroller.dataset.pagenum = passages.number + 1;
		}else {
			scrollObserver.disconnect();
		}	
	}
	// [지문 상세보기 화면으로 이동]--------------------------------------------------
	$(document).on('click', '.js-view-passage', function() {
		const senQuery = this.matches('.note-request-unit') ? `?senQuery=${this.querySelector('.sentence-text').textContent}`:''
		const passageId = Number(this.closest('.passage').dataset.pid);
		sessionStorage.setItem('workbookCover', helloBook?'https://static.findsvoc.com/images/app/workbook/bookcover/hellobook_cover.jpeg':workbookCover);
		sessionStorage.setItem('passageIdList', JSON.stringify(passageIdList));
		$('#loadingModal').modal('show');
		location.assign(`/workbook/passage/${ntoa(workbookId)}/${ntoa(passageId)}${senQuery}`);
	});
	// [(헬로북)지문 등록하기 화면으로 이동]
	if(helloBook) {
		$('.js-add-passage-open').click(function() {
			location.assign('/workbook/mystack/add');
		})
	}else {
	
		// 지문 등록으로 이동
		$('.js-add-passage-open').click(function() {
			if(passageIdList.length >= 30) {
				$('#passageLimitModal').modal('show');
				return;
			}
			sessionStorage.setItem('workbookCover',this.dataset.cover);
			sessionStorage.setItem('passageIdList', JSON.stringify(passageIdList));
			location.assign(`/workbook/passage/add/${ntoa(workbookId)}`);
		});
		// 지문 타이틀 등록으로 이동
		$('.js-add-passage-title').click(function() {
			if(passageIdList.length >= 30) {
				$('#passageLimitModal').modal('show');
				return;
			}		
			location.assign(`/workbook/passagetitle/batch/${ntoa(workbookId)}`);
		})
		
		
		// [지문 타이틀 수정]-----------------------------------------------------------
		$(document).on('click', '.passage-title', function() {
			$(this).hide().siblings('.title-input,.title-edit-btn-section').show()
			.closest('.passage-title-section').addClass('edit');
		}).on('click','.js-edit-ptitle', function() {
			const titleSection = this.closest('.passage-title-section');
			const passageTitle = $(titleSection).find('.title-input').val().trim();
	
			const command = {
				passageId: this.closest('.passage').dataset.pid }
			if(passageTitle.length > 0) {
				command['passageTitle'] = passageTitle;
			}
			// (ajax) 지문 타이틀 수정-----------
			editPassageTitle(command, () => {
				alertModal('지문 제목이 수정되었습니다.');
				$(titleSection).removeClass('edit');
				$(titleSection).find('.passage-title').text(passageTitle||'제목 없음').attr('title', passageTitle||'제목 없음').show();
				$(titleSection).find('.title-input,.title-edit-btn-section').hide();
			}, () => alertModal('지문 제목 수정 중 오류가 발생했습니다.'));
			//-----------------------------------------------
		}).on('click', '.js-cancel-ptitle', function() {
			const titleSection = this.closest('.passage-title-section');
			const $title = $(titleSection).find('.passage-title').show();
			$(titleSection).removeClass('edit');
			$(titleSection).find('.title-input').val($title.text()).hide();
			$(titleSection).find('.title-edit-btn-section').hide();
		})
		
		// [지문 수정 화면으로 이동]-----------------------------------------------------
		.on('click', '.js-edit-passage', function() {
			const passageId = Number(this.closest('.passage').dataset.pid);
	
			sessionStorage.setItem('workbookId', workbookId);
			sessionStorage.setItem('workbookCover', workbookCover);
			sessionStorage.setItem('passageIdList', JSON.stringify(passageIdList));		
			sessionStorage.setItem('editingPassageId', passageId);
			location.assign('/workbook/mybook/edit/passage/' + ntoa(passageId));
		})
		
		// [지문 삭제]----------------------------------------------------------------
		$(document).on('click', '.js-del-passage', function() {
			const $passage = $(this.closest('.passage'));
			const passageId = $passage.data('pid');
			const $listSection = $passage.closest('.list-passage-section');
			const sample = $passage.is('.sample');
			if(confirm('이 지문을 삭제하시겠습니까?')) {
				const command = {workbookId: workbookId, passageId};
				// 지문 삭제(ajax)-----------------------------------
				deletePassage(command, successDelete);
				//-------------------------------------------------
			}
			
			function successDelete() {
				alertModal('지문이 삭제되었습니다.');
				if(sample) sampleCount--;
				$listSection.masonry('remove', $passage).masonry('layout');
			}
		})
		// [샘플 지문으로 등록/해제]-----------------------------------------------------
		.on('click', '.js-toggle-sample', function() {
			const $passage = $(this.closest('.passage'));
			const passageId = $passage.data('pid');
			const msg = $passage.is('.sample') ? '이 지문을 샘플에서 제외하시겠습니까?'
											: '이 지문을 샘플로 지정하시겠습니까?';
			const sample = !$passage.is('.sample');
			
			if(sample && sampleCount == 6) {
				alertModal('한 워크북에 지정할 샘플 지문의 최대 갯수는 6개입니다.');
				return;
			}
			
			if(confirm(msg)) {
				const command = {workbookId: workbookId, passageId, sample};
				// 샘플 지정/해제(ajax)----------------------
				editPassageSample(command, successSample);
				//----------------------------------------
			}
			
			function successSample() {
				alertModal('지문 샘플정보를 변경했습니다.');
				sampleCount += (sample) ? 1 : -1;
				$passage.toggleClass('sample');
			}
		});
		
		// [공동 작업자 조회/수정하기]------------------------------------------------
		$('.open-add-coworker').on('click', function() {
			const $listSection = $('#coworker-edit-modal .list-coworker-section');
			if($listSection.children().length == 0) {
				$.getJSON(`/workbook/coworker/list/${ntoa(workbookId)}`, workers => {
					$listSection.get(0).appendChild(createElement(Array.from(workers, worker => createWorker(worker))))
				}).fail(() => alertModal('공동 작업자 조회에 실패했습니다.'))
			}
			$('#coworker-edit-modal').modal('show');
		})
		// [공동 작업자 관리모달이 닫힐 땐 추가목록 초기화]
		$('#coworker-edit-modal').on('hidden.bs.modal', function() {
			$(this).find('.list-new-coworker-section').empty();
			$(this).find('.add-coworker-btn').prop('disabled', true);
		})
		// [회원 이메일 주소 확인 & 추가할 작업자 목록에 등록]
		$('.check-coworker-btn').on('click', function() {
			const input = $('#coworker-email').get(0);
			if(input.value.length > 0 && input.checkValidity()) {
				$.getJSON('/member/search', { email: btoa(input.value.trim()) }, worker => {
					input.value = '';
					if(worker) {
						const newWorkerBlock = createElement(createWorker(worker));
						$(newWorkerBlock).find('.del-btn').hide().before(createElement({
							el: 'span', className: 'col-1 my-auto fas fa-plus new-worker-symbol' 
						}));
						$('#coworker-edit-modal .list-new-coworker-section').get(0).appendChild(newWorkerBlock);
						$('.add-coworker-btn').prop('disabled', false);
					}else{ 
						alertModal('존재하지 않은 회원입니다.');
					}
				})
			}
		})
		// [공동 작업자 추가 등록]---------------------------------------------------
		$('.add-coworker-btn').on('click', function() {
			const coworkerIdList = Array.from($('.list-new-coworker-section').get(0).children, block => block.dataset.mid);
			$.ajax({
				url: '/workbook/coworker/add',
				type: 'POST',
				data: { workbookId, coworkerIdList },
				success: function() {
					alertModal('공동 작업자가 추가되었습니다.');
					$('#coworker-email').val('');
					$('.add-coworker-btn').prop('disabled', true);
					$('.list-new-coworker-section').children().each(function() {
						$(this).find('.del-btn').show();
						$(this).find('.new-worker-symbol').remove();
					});
					$('.list-coworker-section').append($('.list-new-coworker-section').children());
				},
				error: function() {
					alertModal('작업자 등록에 실패했습니다.');
				}
			})
		})
		// [피드백 목록, 피코쌤노트요청 목록 추가 조회]----------------------------------
		$(document).on('click', '.feedback-list .page-item, .note-request-list .page-item', function() {
			const content = this.closest('.pagination-section').dataset.content;
			const workbookId56 = ntoa(workbookId);
			const pageNum = this.dataset.pagenum;
			$.getJSON(`/workbook/${content}/list/${workbookId56}`, { pageNum }, page => content == 'feedback' ? feedbackPageRefresh(page) : ssamnoteRequestPageRefresh(page));
		})
		
		// [피드백 블럭을 누르면 펼치기/접기]------------------------------------------
		.on('click', '.feedback-unit', function() {
			const $text = $(this).find('.feedback-text');
			const textMax = $text.data('org');
			const textMin = textMax.replace(/[\r\n].+/g,'');
			$text.css('white-space', $(this).is('.open') ? 'nowrap' : 'break-spaces');
			$text.text($(this).is('.open') ? `${textMin}...` : textMax);
			$(this).toggleClass('open')
		})
		
		
		function createWorker(worker) {
			return { el: 'div', className: 'coworker row g-0', 'data-mid': worker.memberId, children: [
				{ el: 'div', className: 'member-personacon', children: [
					{ el: 'img', className: 'personacon-profile', src: 'https://static.findsvoc.com/images/app/member/profile_paper.png',
					style: {
					    backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat',
					    backgroundImage: (worker?.image.length > 0) ? `url(/resource/profile/images/${worker.image})` : 'var(--fc-logo-head)'
					}}
				]},
				{ el: 'span', className: 'email col-6 my-auto', textContent: worker.email },
				{ el: 'span', className: 'alias col-3 my-auto', textContent: worker.alias },
				{ el: 'button', className: 'my-auto btn del-btn col-1 fas fa-trash-alt', onclick: function() {
					const _this = this;
					confirmModal(`${worker.alias}님을 작업자에서 제외하시겠습니까?`, function() {
						$.ajax({
							url: '/workbook/coworker/del',
							type: 'POST',
							data: { workbookId, coworkerIdList: [worker.memberId] },
							success: function() {
								$(_this).closest('.coworker').remove();
								alertModal(`${worker.alias}님을 작업자에서 제외했습니다.`);
							},
							error: function() {
								alertModal('작업자 제외가 실패했습니다.');
							}
						})
					})
				}}
			]}
		}
		function feedbackPageRefresh(page) {
			const contentJSONs = Array.from(page.content, item => {
				return { el: 'div', className: 'feedback-unit row g-0', role: 'button', title: '펼쳐보기/접기', children: [
					{ el: 'div', className: 'col-8 col-xl-10 row g-0 m-auto', children: [
						{ el: 'span', className: 'feedback-text text-truncate', 'data-org': item.content , textContent: item.content.replace(/\n.+/g, '') }
					]},
					{ el: 'div', className: 'col-2 m-auto text-center', children: [
						{ el: 'span', className: 'reg-date', textContent: new Date(item.regDate).format('yyyy-MM-dd') }
					]}
				]};
			})
			$('.feedback-list .feedback-unit').remove();
			$('.feedback-list .pagination-section').before(createElement(contentJSONs));
			$('.feedback-list .pagination-section .swiper-pagination').get(0).replaceChildren(createElement(getPaginations(page)));
		}
		
		function ssamnoteRequestPageRefresh(page) {
			const requestStatusLabels = {'H' : '대기중', 'W' : '작성중', 'D' : '작성&lt;br&gt;완료', 'C' : '취 소', 'S' : '추 천'};
			const contentJSONs = Array.from(page.content, item => {
				return {
				el: 'div', className: `note-request-unit row g-0 js-view-passage passage status-${item.progressStatus.toLowerCase()}`,
				role: 'button', 'data-pid': item.passageId, 'data-bs-toggle': 'tooltip', title: '클릭시 노트를 신청한 지문 상세보기로 이동합니다.', children: [
					// 상태값
					{ el: 'div', className: 'col-2 col-xl-1 row g-0 m-auto', children: [
						{ el: 'div', className: 'badge-block', children: [
							{ el: 'span', className: 'status-text', innerHTML: requestStatusLabels[item.progressStatus] }
						]}
					]},
					// 문장내용(추천의 경우 +제안문구)
					{ el: 'div', className: 'col-8 col-xl-9 row g-0 m-auto', children: [
						item.progressStatus == 'S' ? { el: 'span', className: 'suggest-text', children: [
							'이 문장에 대해 ', { el: 'span', className: 'app-name-text', textContent: 'fico' },
							'쌤 노트를 ', { el: 'b', textContent: '신청' }, '해 보면 어떨까요?'
						]} : '',
						{ el: 'span', className: 'sentence-text text-truncate', textContent: item.sentence.eng }
					]},
					// 등록일
					{ el: 'div', className: 'col-2 m-auto text-center', children: [
						{ el: 'span', className: 'reg-date', textContent: new Date(item.regDate).format('yyyy-MM-dd')}
					]}
				]}
			})
			$('.note-request-list .note-request-unit').remove();
			$('.note-request-list .pagination-section').before(createElement(contentJSONs));
			$('.note-request-list .pagination-section .swiper-pagination').get(0).replaceChildren(createElement(getPaginations(page)));
		}

		function getPaginations(page) {
			const totalPages = page.totalPages,	// 전체 페이지 수
				currPage = page.number + 1,		// 현재 페이지(1부터)
				blockLength = 10,
				currBlock = Math.ceil(currPage / blockLength),	// 현재 페이지리스트 뭉치 번호(1부터)
				startPage = (currBlock - 1) * blockLength + 1,				// 페이지리스트 첫번째 번호(1부터)
				endPage = (startPage + blockLength <= totalPages) ? (startPage + blockLength - 1) : totalPages; // 페이지리스트 마지막 번호
			
			const pages = [];
			for(let i = startPage; i <= endPage; i++) {
				pages.push({
					el: 'span', className: `page-item swiper-pagination-bullet${currPage==i?' swiper-pagination-bullet-active':''}`,
					'data-pagenum': i
				})
			}
			if(startPage > blockLength)
				pages.unshift({
					el: 'span', className: 'page-item', role: 'button', 'data-pagenum': startPage - 1 , innerHTML: '&laquo;'
				})
			if(endPage < totalPages) 
				pages.push({
					el: 'span', className: 'page-item', role: 'button', 'data-pagenum': endPage + 1, innerHTML: '&raquo;'
				})
			return pages;
		}
	}
}