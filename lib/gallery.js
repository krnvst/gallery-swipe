const GalleryClassName = 'gallery';
const GalleryDraggableClassName = 'gallery-draggable';
const GalleryLineClassName = 'gallery-line';
const GallerySlideClassName = 'gallery-slide';
const GalleryDotsClassName = 'gallery-dots';
const GalleryDotClassName = 'gallery-dot';
const GalleryDotActiveClassName = 'gallery-dot-active';
const GalleryNavClassName = 'gallery-nav';
const GalleryNavLeftClassName = 'gallery-nav-left';
const GalleryNavRigthClassName = 'gallery-nav-right';
const SpeedTransition = '.25';

class Gallery {
    // Конструктор - для создания объектов и начальной инициализации,
    // которая должна быть выполнена до того, как остальные методы вызваны.
    constructor(element, options = {}) {
        this.containerNode = element;
        // Node.childElementCount возвращает число дочерних элементов узла
        this.size = element.childElementCount;
        // активный первый слайд
        this.currentSlide = 0;
        this.currentSlideWasChange = false;
        this.settings = {
            margin: options.margin || 0
        };

        // .bind()
        this.manageHTML = this.manageHTML.bind(this);
        this.setParameters = this.setParameters.bind(this);
        this.setEvents = this.setEvents.bind(this);
        this.resizeGallery = this.resizeGallery.bind(this);
        this.startDrag = this.startDrag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.dragging = this.dragging.bind(this);
        this.setStylePosition = this.setStylePosition.bind(this);
        this.clickDots = this.clickDots.bind(this);
        this.moveToLeft = this.moveToLeft.bind(this);
        this.moveToRight = this.moveToRight.bind(this);
        this.changeCurrentSlide = this.changeCurrentSlide.bind(this);
        this.changeActiveDotClass = this.changeActiveDotClass.bind(this);

        this.manageHTML();
        this.setParameters();
        this.setEvents();
    }

    manageHTML() {
        // обарачиваем елементы в div с классом .gallery-slide
        this.containerNode.classList.add(GalleryClassName);
        this.containerNode.innerHTML = `
            <div class="${GalleryLineClassName}">
                ${this.containerNode.innerHTML}
            </div>
            <div class="${GalleryNavClassName}">
                <button class="${GalleryNavLeftClassName}">Left</button>
                <button class="${GalleryNavRigthClassName}">Right</button>
            </div>
            <div class="${GalleryDotsClassName}"></div>
        `;
        this.lineNode = this.containerNode.querySelector(`.${GalleryLineClassName}`);
        this.dotsNode = this.containerNode.querySelector(`.${GalleryDotsClassName}`);

        this.slideNodes = Array.from(this.lineNode.children).map((childNode) =>
            wrapElementByDiv({
                element: childNode,
                className: GallerySlideClassName
            })
        );

        // Создаем точки
        this.dotsNode.innerHTML = Array.from(Array(this.size).keys()).map((key) => (
            `<button class="${GalleryDotClassName} ${key === this.currentSlide ? GalleryDotActiveClassName : ''}"></button>`
        )).join('');

        this.dotNodes = this.dotsNode.querySelectorAll(`.${GalleryDotClassName}`);
        this.navLeft = this.containerNode.querySelector(`.${GalleryNavLeftClassName}`);
        this.navRight = this.containerNode.querySelector(`.${GalleryNavRigthClassName}`);
        console.log(this.dotsNode)
    }

    setParameters() {
        // Element.getBoundingClientRect() - возвращает размер элемента и его позицию
        const coordsContainer = this.containerNode.getBoundingClientRect();
        this.width = coordsContainer.width;
        this.maximumX = -(this.size - 1) * (this.width + this.settings.margin);
        this.x = -this.currentSlide * (this.width + this.settings.margin);

        this.resetStyleTransition();
        // Устанавливаем ширину lineNode и добавляем стиль в .gallery-line
        this.lineNode.style.width = `${this.size * (this.width + this.settings.margin)}px`
        this.setStylePosition();
        // Устанавливаем ширину каждого слайда и добавляем стиль в .gallery-slide
        Array.from(this.slideNodes).forEach(slideNode => {
            slideNode.style.width = `${this.width}px`;
            slideNode.style.marginRight = `${this.settings.margin}px`;
        });
    }

    setEvents() {
        // debounce - чтобы пересчет был реже
        this.debouncedResizeGallery = debounce(this.resizeGallery);
        window.addEventListener('resize', this.debouncedResizeGallery);

        // Скролл
        this.lineNode.addEventListener('pointerdown', this.startDrag);
        window.addEventListener('pointerup', this.stopDrag);
        window.addEventListener('pointercancel', this.stopDrag);

        // Клик по точки
        this.dotsNode.addEventListener('click', this.clickDots);

        // Клик по кнопкам навигации
        this.navLeft.addEventListener('click', this.moveToLeft);
        this.navRight.addEventListener('click', this.moveToRight);
    }

    destroyEvents() {
        window.removeEventListener('resize', this.debouncedResizeGallery);
        this.lineNode.removeEventListener('pointerdown', this.startDrag);
        window.removeEventListener('pointerup', this.stopDrag);
        window.removeEventListener('pointercancel', this.stopDrag);
        // точки
        this.dotsNode.removeEventListener('click', this.clickDots);

        // кнопки навигации
        this.navLeft.removeEventListener('click', this.moveToLeft);
        this.navRight.removeEventListener('click', this.moveToRight);
    }

    resizeGallery() {
        // при ресайзе заного пересчитываем ширину слайдов итд
        this.setParameters();
    }

    startDrag(evt) {
        this.currentSlideWasChange = false;
        this.clickX = evt.pageX;
        this.startX = this.x;

        this.resetStyleTransition();

        this.containerNode.classList.add(GalleryDraggableClassName);
        window.addEventListener('pointermove', this.dragging);
    }

    stopDrag() {
        window.removeEventListener('pointermove', this.dragging);

        this.containerNode.classList.remove(GalleryDraggableClassName);

        this.changeCurrentSlide();
    }

    dragging(evt) {
        this.dragX = evt.pageX;
        const dragShift = this.dragX - this.clickX;
        const easing = dragShift / 5;
        this.x = Math.max(Math.min(this.startX + dragShift, easing), this.maximumX + easing);

        this.setStylePosition();

        // change active slide
        if (
            dragShift > 20 &&
            dragShift > 0 &&
            !this.currentSlideWasChange &&
            this.currentSlide > 0
        ) {
            this.currentSlideWasChange = true;
            this.currentSlide = this.currentSlide - 1;
        }

        if (
            dragShift < -20 &&
            dragShift < 0 &&
            !this.currentSlideWasChange &&
            this.currentSlide < this.size - 1
        ) {
            this.currentSlideWasChange = true;
            this.currentSlide = this.currentSlide + 1;
        }
    }

    clickDots(evt) {
        // Element.closest() возвращает ближайший родительский элемент
        const dotNode = evt.target.closest('button');
        if (!dotNode) {
            return;
        }

        let dotNumber;
        for(let i = 0; i < this.dotNodes.length; i++) {
            if(this.dotNodes[i] === dotNode) {
                dotNumber = i;
                break;
            }
        }

        if (dotNumber === this.currentSlide) {
            return;
        }

        const countSwipes = Math.abs(this.currentSlide - dotNumber);
        this.currentSlide = dotNumber;
        this.changeCurrentSlide(countSwipes);
    }

    moveToLeft() {
        // Кнопка влево
        if (this.currentSlide <= 0) {
            return;
        }

        this.currentSlide = this.currentSlide - 1;
        this.changeCurrentSlide();
    }

    moveToRight() {
        // Кнопка вправо
        if (this.currentSlide >= this.size -1) {
            return;
        }

        this.currentSlide = this.currentSlide + 1;
        this.changeCurrentSlide();
    }

    changeCurrentSlide() {
        this.x = -this.currentSlide * (this.width + this.settings.margin);
        this.setStyleTransition();
        this.setStylePosition();
        this.changeActiveDotClass();
    }

    changeActiveDotClass() {
        // Меняем цвет точек
        for(let i = 0; i < this.dotNodes.length; i++) {
            this.dotNodes[i].classList.remove(GalleryDotActiveClassName)
        }
        this.dotNodes[this.currentSlide].classList.add(GalleryDotActiveClassName);
    }


    setStylePosition() {
        this.lineNode.style.transform = `translate3d(${this.x}px, 0, 0)`
    }

    setStyleTransition() {
        this.lineNode.style.transition = `all ${SpeedTransition}s ease 0s`
    }

    resetStyleTransition() {
        this.lineNode.style.transition = 'all 0s ease 0s'
    }

}

// helpers
function wrapElementByDiv({element, className}) {
    // функция которая оборачивает елемент в другой с переданным классом
    const wrapperNode = document.createElement('div');
    wrapperNode.classList.add(className);

    // parentNode - родитель текущего элемента
    // Node.insertBefore() добавляет элемент в список дочерних элементов родителя (перед указанным элементом)
    element.parentNode.insertBefore(wrapperNode, element);
    wrapperNode.appendChild(element);

    return wrapperNode;
}

function debounce(func, time = 100) {
    // debounce не позволит обратному вызову исполняться чаще, чем один раз в заданный период времени
    let timerId;
    return function (event) {
        clearTimeout(timerId);
        timerId = setTimeout(func, time, event);
    }
}