const GalleryClassName = 'gallery';
// const GalleryDraggableClassName = 'gallery-draggable';
const GalleryLineClassName = 'gallery-line';
const GallerySlideClassName = 'gallery-slide';

class Gallery {
    // Конструктор - для создания объектов и начальной инициализации,
    // которая должна быть выполнена до того, как остальные методы вызваны.
    constructor(element, options = {}) {
        this.containerNode = element;
        // Node.childElementCount возвращает число дочерних элементов узла
        this.size = element.childElementCount;
        // активный первый слайд
        this.currentSlide = 0;

        this.manageHTML = this.manageHTML.bind(this);
        this.manageHTML();
        this.setParameters();

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
        const coordsContainer = this.containerNode.getBoundingClientRect()
        this.width = coordsContainer.width

        // Устанавливаем ширину lineNode и добавляем стиль в .gallery-line
        this.lineNode.style.width = `${this.size * this.width}px`
        // Устанавливаем ширину каждого слайда и добавляем стиль в .gallery-slide
        Array.from(this.slideNodes).forEach(slideNode => {
            slideNode.style.width = `${this.width}px`
        });
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