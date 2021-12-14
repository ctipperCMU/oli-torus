var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import React, { createRef, useCallback, useEffect, useState } from 'react';
import SwiperCore, { A11y, Keyboard, Navigation, Pagination, Zoom } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { CapiVariableTypes } from '../../../adaptivity/capi';
import { NotificationType, subscribeToNotification, } from '../../../apps/delivery/components/NotificationContext';
import './Carousel.css';
const Carousel = (props) => {
    var _a, _b;
    const [ready, setReady] = useState(false);
    const id = props.id;
    const [images, setImages] = useState(props.model.images || []);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [viewedSlides, setViewedSlides] = useState([]);
    const [captionRefs, setCaptionRefs] = useState([]);
    const [carouselZoom, setCarouselZoom] = useState(true);
    const [cssClass, setCssClass] = useState('');
    const [swiper, setSwiper] = useState(null);
    // initialize the swiper
    SwiperCore.use([Navigation, Pagination, A11y, Keyboard, Zoom]);
    const initialize = useCallback((pModel) => __awaiter(void 0, void 0, void 0, function* () {
        // set defaults
        const dZoom = typeof pModel.zoom === 'boolean' ? pModel.zoom : carouselZoom;
        setCarouselZoom(dZoom);
        const dCssClass = pModel.customCssClass || cssClass;
        setCssClass(dCssClass);
        const dImages = pModel.images || images;
        setImages(dImages);
        const initResult = yield props.onInit({
            id,
            responses: [
                {
                    key: 'customCssClass',
                    type: CapiVariableTypes.STRING,
                    value: dCssClass,
                },
                {
                    key: 'zoom',
                    type: CapiVariableTypes.BOOLEAN,
                    value: dZoom,
                },
            ],
        });
        // result of init has a state snapshot with latest (init state applied)
        const currentStateSnapshot = initResult.snapshot;
        const sZoom = currentStateSnapshot[`stage.${id}.zoom`];
        if (sZoom !== undefined) {
            setCarouselZoom(sZoom);
        }
        const sCssClass = currentStateSnapshot[`stage.${id}.customCssClass`];
        if (sCssClass !== undefined) {
            setCssClass(sCssClass);
        }
        const sCurrentImage = currentStateSnapshot[`stage.${id}.Current Image`];
        if (sCurrentImage !== undefined) {
            setCurrentSlide(sCurrentImage);
        }
        setReady(true);
    }), []);
    useEffect(() => {
        if (!props.notify) {
            return;
        }
        const notificationsHandled = [
            NotificationType.CHECK_STARTED,
            NotificationType.CHECK_COMPLETE,
            NotificationType.CONTEXT_CHANGED,
            NotificationType.STATE_CHANGED,
        ];
        const notifications = notificationsHandled.map((notificationType) => {
            const handler = (payload) => {
                /* console.log(`${notificationType.toString()} notification handled [Carousel]`, payload); */
                switch (notificationType) {
                    case NotificationType.CHECK_STARTED:
                        // nothing to do
                        break;
                    case NotificationType.CHECK_COMPLETE:
                        // nothing to do
                        break;
                    case NotificationType.STATE_CHANGED:
                        {
                            const { mutateChanges: changes } = payload;
                            const sZoom = changes[`stage.${id}.zoom`];
                            if (sZoom !== undefined) {
                                setCarouselZoom(sZoom);
                            }
                            const sCurrentImage = changes[`stage.${id}.Current Image`];
                            if (sCurrentImage !== undefined) {
                                if (swiper) {
                                    swiper.slideTo(sCurrentImage);
                                }
                            }
                        }
                        break;
                    case NotificationType.CONTEXT_CHANGED:
                        {
                            const { initStateFacts: changes } = payload;
                            const sZoom = changes[`stage.${id}.zoom`];
                            if (sZoom !== undefined) {
                                setCarouselZoom(sZoom);
                            }
                        }
                        break;
                }
            };
            const unsub = subscribeToNotification(props.notify, notificationType, handler);
            return unsub;
        });
        return () => {
            notifications.forEach((unsub) => {
                unsub();
            });
        };
    }, [props.notify, swiper]);
    useEffect(() => {
        initialize(props.model);
    }, [props.model]);
    useEffect(() => {
        if (!ready) {
            return;
        }
        props.onReady({ id, responses: [] });
    }, [ready]);
    const { z = 0, width, height, fontSize = 16 } = props.model;
    const MAGIC_NUMBER = 64;
    const PAGINATION_HEIGHT = 32;
    const styles = {
        fontSize: `${fontSize}px`,
        zIndex: z,
        overflow: 'hidden',
        display: 'flex',
    };
    const imgStyles = {
        maxWidth: `calc(${width}px - ${MAGIC_NUMBER}px)`,
        maxHeight: imagesLoaded
            ? `calc(${height}px - ${(_b = (_a = captionRefs[currentSlide]) === null || _a === void 0 ? void 0 : _a.current) === null || _b === void 0 ? void 0 : _b.clientHeight}px - ${PAGINATION_HEIGHT}px)`
            : `calc(${height} - ${MAGIC_NUMBER}px)`,
    };
    useEffect(() => {
        // when images[] load, refs are set on captions in order to calc() max-height for each image later
        if (images && images.length > 0) {
            setCaptionRefs((captionRefs) => Array(images.length)
                .fill(images.length)
                .map((_, i) => captionRefs[i] || createRef()));
        }
    }, [images]);
    useEffect(() => {
        const styleChanges = {};
        if (width !== undefined) {
            styleChanges.width = { value: width };
        }
        if (height != undefined) {
            styleChanges.height = { value: height };
        }
        props.onResize({ id: `${id}`, settings: styleChanges });
    }, [width, height]);
    const saveState = ({ carouselZoom }) => {
        const vars = [];
        const viewedImagesCount = [...new Set(viewedSlides)].length;
        const currentImage = currentSlide + 1;
        vars.push({
            key: `Current Image`,
            type: CapiVariableTypes.NUMBER,
            value: currentImage,
        });
        vars.push({
            key: `Viewed Images Count`,
            type: CapiVariableTypes.NUMBER,
            value: viewedImagesCount,
        });
        vars.push({
            key: `zoom`,
            type: CapiVariableTypes.BOOLEAN,
            value: carouselZoom,
        });
        props.onSave({
            id: `${id}`,
            responses: vars,
        });
    };
    useEffect(() => {
        saveState({
            carouselZoom,
        });
    }, [currentSlide]);
    const handleSlideChange = (currentSlide) => {
        setViewedSlides((viewedSlides) => [...viewedSlides, currentSlide]);
        setCurrentSlide(currentSlide);
    };
    return ready ? (<div data-janus-type={tagName} className={`janus-image-carousel`} style={styles}>
      {images.length > 0 && (<Swiper slidesPerView={1} loop navigation zoom={carouselZoom ? { maxRatio: 3 } : false} keyboard={{ enabled: true }} pagination={{ clickable: true }} onSwiper={(swiper) => {
                setSwiper(swiper);
                swiper.slideTo(currentSlide);
            }} onSlideChange={(swiper) => {
                handleSlideChange(swiper.realIndex);
            }} onImagesReady={() => {
                setImagesLoaded(true);
            }}>
          {images.map((image, index) => (<SwiperSlide key={index} zoom={carouselZoom}>
              <figure className="swiper-zoom-container">
                <img style={imgStyles} src={image.url} alt={image.alt ? image.alt : undefined}/>
                {image.caption && <figcaption ref={captionRefs[index]}>{image.caption}</figcaption>}
              </figure>
            </SwiperSlide>))}
        </Swiper>)}
      {images.length <= 0 && <div className="no-images">No images to display</div>}
    </div>) : null;
};
export const tagName = 'janus-image-carousel';
export default Carousel;
//# sourceMappingURL=Carousel.jsx.map