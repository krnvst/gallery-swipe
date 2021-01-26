const GalleryClassName = 'gallery';
// const GalleryDraggableClassName = 'gallery-draggable';
const GalleryLineClassName = 'gallery-line';
const GallerySlideClassName = 'gallery-slide';
const SpeedTransition = '.25'

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

        this.manageHTML();
        this.setParameters();
        this.setEvents();

        console.groupCollapsed('this класса Gallery')
        console.dir(this)
        console.groupEnd()
    }

    manageHTML() {
        // обарачиваем елементы в div с классом .gallery-slide
        this.containerNode.classList.add(GalleryClassName);
        this.containerNode.innerHTML = `
            <div class="${GalleryLineClassName}">
                ${this.containerNode.innerHTML}
            </div>
        `;
        this.lineNode = this.containerNode.querySelector(`.${GalleryLineClassName}`);

        this.slideNodes = Array.from(this.lineNode.children).map((childNode) =>
            wrapElementByDiv({
                element: childNode,
                className: GallerySlideClassName
            })
        );
    }

    setParameters() {
        // Element.getBoundingClientRect() - возвращает размер элемента и его позицию
        const coordsContainer = this.containerNode.getBoundingClientRect();
        this.width = coordsContainer.width;
        this.maximumX = -(this.size - 1) * this.width;
        this.x = -this.currentSlide * this.width;

        // Устанавливаем ширину lineNode и добавляем стиль в .gallery-line
        this.lineNode.style.width = `${this.size * this.width}px`
        // Устанавливаем ширину каждого слайда и добавляем стиль в .gallery-slide
        Array.from(this.slideNodes).forEach(slideNode => {
            slideNode.style.width = `${this.width}px`
        });
    }

    setEvents() {
        // debounce - чтобы пересчет был реже
        this.debouncedResizeGallery = debounce(this.resizeGallery);
        window.addEventListener('resize', this.debouncedResizeGallery);

        // Скролл
        this.lineNode.addEventListener('pointerdown', this.startDrag);
        window.addEventListener('pointerup', this.stopDrag);
    }

    destroyEvents() {
        window.removeEventListener('resize', this.debouncedResizeGallery);
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
        window.addEventListener('pointermove', this.dragging);
        this.setStyleTransition();
    }

    stopDrag() {
        window.removeEventListener('pointermove', this.dragging);
        this.x = -this.currentSlide * this.width;
        this.setStylePosition();
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