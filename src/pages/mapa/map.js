/* map.js
   Responsabilidade: mapa, pins, modal, abas, formulários, interações.
   Usa locationService e commentService.
*/

import { locationService } from "../../services/location-service.js";
import { commentService } from "../../services/comment-service.js";
import { resolveImageUrl } from "../../utils/image-utils.js";
import { detectTypeFromName, getColorForType } from "../../utils/location-utils.js";
import { showAlert } from "../../utils/modal.js";

const MODAL_IDS = {
  infoModal: "infoModal",
  addCommentModal: "addCommentModal",
};

document.addEventListener("DOMContentLoaded", () => {
  const imgUrl = "/assets/img/map/mapa_ifba.svg";
  const img = new Image();

  // Garantir modal fechado
  const initialModal = document.getElementById(MODAL_IDS.infoModal);
  if (initialModal) initialModal.style.display = "none";

  // Estado de modal
  let inModal = false;
  let modalPushed = false;

  // Mapeamento de nomes de locais para imagens
  const imageMap = {
    estacionamento: "/assets/img/map/estacionamento.svg",
    "bloco 5": "/assets/img/map/Bloco-5.svg",
    "bloco 6": "/assets/img/map/Bloco-6.svg",
    "bloco 8": "/assets/img/map/Bloco-8.svg",
    "bloco 9": "/assets/img/map/Bloco-9.svg",
    "bloco 16": "/assets/img/map/Bloco-16.svg",
    "quadra de areia": "/assets/img/map/Quadra de areia.svg",
    quadra: "/assets/img/map/Quadra.svg",
    campo: "/assets/img/map/Quadra.svg",
    biblioteca: "/assets/img/map/Biblioteca.svg",
    cantina: "/assets/img/map/Cantina.svg",
    auditório: "/assets/img/map/Auditório.svg",
    cores: "/assets/img/map/Cores.svg",
    entrada: "/assets/img/map/entrada.svg",
  };

  // Função para encontrar a imagem com matching flexível
  function getImagePath(label) {
    const lowerLabel = label.toLowerCase().trim();

    // Busca exata primeiro
    if (imageMap[lowerLabel]) {
      return imageMap[lowerLabel];
    }

    // Busca parcial para blocos (ex: "Bloco 5" pode estar como "bloco 5" ou com caracteres extras)
    if (lowerLabel.includes("bloco")) {
      if (lowerLabel.includes("5")) return imageMap["bloco 5"];
      if (lowerLabel.includes("6")) return imageMap["bloco 6"];
      if (lowerLabel.includes("8")) return imageMap["bloco 8"];
      if (lowerLabel.includes("9")) return imageMap["bloco 9"];
      if (lowerLabel.includes("16")) return imageMap["bloco 16"];
    }

    // Busca para outros tipos
    if (lowerLabel.includes("quadra de areia") || lowerLabel.includes("areia"))
      return imageMap["quadra de areia"];
    if (lowerLabel.includes("quadra")) return imageMap["quadra"];
    if (lowerLabel.includes("campo")) return imageMap["campo"];
    if (lowerLabel.includes("estacionamento"))
      return imageMap["estacionamento"];
    if (lowerLabel.includes("biblioteca")) return imageMap["biblioteca"];
    if (lowerLabel.includes("cantina")) return imageMap["cantina"];
    if (lowerLabel.includes("audit")) return imageMap["auditório"];
    if (lowerLabel.includes("cores")) return imageMap["cores"];
    if (lowerLabel.includes("entrada")) return imageMap["entrada"];

    return null;
  }

  // Função para criar ícone de pin
  function makePinIcon(color = "#FF0000", tipo = "default", label = "") {


    const imagePath = getImagePath(label);
    let iconHtml;

    if (imagePath) {
      // SVG apenas círculo com imagem no centro
      iconHtml = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="circle-clip">
              <circle cx="20" cy="20" r="18"/>
            </clipPath>
          </defs>
          <!-- Circle background -->
          <circle cx="20" cy="20" r="19" fill="${color}"/>
          <!-- White border circle -->
          <circle cx="20" cy="20" r="18" fill="#fff"/>
          <!-- Image inside clipped circle -->
          <image href="${imagePath}" x="2" y="2" width="36" height="36" clip-path="url(#circle-clip)" preserveAspectRatio="xMidYMid slice"/>
        </svg>
      `;
    } else {
      // Fallback apenas com círculo SVG
      iconHtml = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <circle cx="20" cy="20" r="19" fill="${color}"/>
          <circle cx="20" cy="20" r="18" fill="#fff"/>
        </svg>
      `;
    }

    return L.divIcon({
      className: `pin-marker pin-${tipo}`,
      html: `
      <div class="pin-with-label">
        <div class="pin-label">${label}</div>
        <div class="pin-icon">${iconHtml}</div>
      </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  // ===== FUNÇÃO HELPER: Resolver IDs de imagem para URLs =====
  // Helper importado de image-utils.js (resolveImageUrl)


  // ===== FUNÇÃO HELPER: Renderizar carrossel de imagens =====
  // Centraliza a lógica de exibição de imagens para reutilização
  function renderImagesCarousel(swiperWrapper, images) {
    // Limpa slides anteriores
    swiperWrapper.innerHTML = '';

    // Fallback: sem imagens
    if (!images || images.length === 0) {
      swiperWrapper.innerHTML = `
      <div class="swiper-slide" style="background-color: #ffffff; height: 100%;">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; color: #9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p style="font-size: 14px; font-weight: 500;">Sem imagens disponíveis</p>
        </div>
      </div>
    `;
    } else {
      // Renderizar um slide por imagem
      images.forEach((image) => {
        const imageUrl = resolveImageUrl(image);
        if (!imageUrl) return;

        const slide = document.createElement('div');
        slide.className = 'swiper-slide';

        slide.innerHTML = `
        <div class="project-img">
          <img
            src="${imageUrl}"
            alt="Imagem do comentário"
            style="width: 90%; height: 90%; object-fit: cover;"
          />
        </div>
      `;

        swiperWrapper.appendChild(slide);
      });
    }

    // Inicializar Swiper apenas uma vez
    if (!window.swiperInstance) {
      window.swiperInstance = new Swiper('.swiper', {
        loop: images && images.length > 1,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
      });
    } else {
      // Atualizar corretamente quando trocar as imagens
      window.swiperInstance.update();
      window.swiperInstance.slideTo(0, 0);
    }
  }

  // Abre modal com dados (somente apresentação)
  async function openLocationModal(locationData) {
    try {
      // Definir o ID do local atual para uso no formulário de comentário
      window.currentLocationId = locationData.id;

      // Usar os dados já carregados de locationData (evita requisição duplicada)
      const details = locationData;

      // ELEMENTOS DO MODAL
      const modal = document.getElementById("infoModal");
      if (modal) modal.style.display = "block"; // Exibir modal imediatamente

      const titleEl = document.querySelector("#location-title");
      const descEl = document.querySelector("#location-description");
      const starsEl = document.querySelector(".stars");
      const swiperWrapper = document.querySelector(".swiper-wrapper");
      const infoContent = document.querySelector("#info-content");
      const commentsList = document.querySelector(
        "#review-content .comments-list"
      );

      // =========================
      // 1. TÍTULO E DESCRIÇÃO
      // =========================
      titleEl.textContent = details.name || "Sem nome";
      // Atualiza descrição somente se o elemento estiver presente (aba removida em alguns layouts)
      if (descEl) {
        descEl.textContent = details.description || "";
      }

      // =========================
      // 4. ITENS DE ACESSIBILIDADE (será atualizado após carregar comentários)
      // =========================
      infoContent.innerHTML = `
        <div style="display: flex; justify-content: center; padding: 20px;">
          <span class="loader" style="width: 24px; height: 24px; border-width: 3px;"></span>
        </div>
      `;

      // =========================
      // 5. COMENTÁRIOS E AVALIAÇÃO E IMAGENS (Unificado)
      // =========================
      commentsList.innerHTML = `
        <div class="loader-container" style="padding: 20px;">
          <span class="loader" style="width: 30px; height: 30px; border-width: 3px;"></span>
        </div>`;

      swiperWrapper.innerHTML = `
        <div class="swiper-slide" style="height: 100%; background: #f3f4f6;">
          <div class="loader-container">
            <span class="loader"></span>
          </div>
        </div>`;

      try {
        // Busca comentários uma única vez
        const commentsResponse = await commentService.getByLocation(locationData.id);
        const comments = commentsResponse.comments || [];

        // A. Renderizar Lista de Comentários
        commentsList.innerHTML = "";
        if (comments.length === 0) {
          commentsList.innerHTML =
            "<p>Este local ainda não possui comentários.</p>";
        } else {
          comments.forEach((c) => {
            // Gerar estrelas para cada comentário
            let commentStars = "";
            for (let i = 1; i <= 5; i++) {
              if (i <= c.rating) {
                commentStars += '<span class="star-icon filled"></span>';
              } else {
                commentStars += '<span class="star-icon empty"></span>';
              }
            }

            commentsList.innerHTML += `
                  <div class="comment-card">
                      <div class="comment-header">
                          <span class="user-name">${c.user_name}</span>
                          <span class="comment-date">${new Date(
              c.created_at || c.date // Fallback para c.date se created_at não existir
            ).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div class="comment-rating">${commentStars}</div>
                      ${c.description ? `<p class="comment-description">${c.description}</p>` : ""}
                      <p class="comment-text">${c.comment}</p>
                  </div>
                  `;
          });
        }

        // B. Calcular Avaliação Média
        let totalRating = 0;
        let count = 0;
        comments.forEach((c) => {
          if (c.rating && c.rating > 0) {
            totalRating += c.rating;
            count++;
          }
        });
        let avgRating = count > 0 ? totalRating / count : 0;
        let rating = Math.floor(avgRating);

        // Renderizar estrelas da média
        let starsHTML = "";
        for (let i = 1; i <= 5; i++) {
          if (i <= rating) {
            starsHTML += '<span class="star-icon filled"></span>';
          } else {
            starsHTML += '<span class="star-icon empty"></span>';
          }
        }
        starsEl.innerHTML = starsHTML;

        // C. Popuar Carrossel de Imagens
        let allImages = [];
        comments.forEach((c) => {
          if (c.images && Array.isArray(c.images)) {
            allImages = allImages.concat(c.images);
          }
        });

        renderImagesCarousel(swiperWrapper, allImages);

        // D. Coletar e exibir ícones dos comentários (sem duplicatas)
        // Usar diretamente os ícones que já vêm nos comentários (sem requisição extra)
        const iconMap = new Map();

        comments.forEach((c) => {
          // Os ícones completos já vêm em comment_icons
          if (c.comment_icons && Array.isArray(c.comment_icons)) {
            c.comment_icons.forEach(icon => {
              if (icon.id && !iconMap.has(icon.id)) {
                iconMap.set(icon.id, icon);
              }
            });
          }
        });

        // Converter Map para array de ícones únicos
        const allCommentIcons = Array.from(iconMap.values());

        // Atualizar aba Descrição com a descrição do local
        const descriptionText = document.getElementById("location-description-text");
        if (descriptionText) {
          descriptionText.textContent = details.description && details.description.trim()
            ? details.description
            : "Sem descrição disponível";
        }

        // Construir HTML apenas com ícones de acessibilidade para a aba Informações
        let infoHtml = '';

        // Atualizar seção de Informações de Acessibilidade com os ícones
        if (allCommentIcons.length > 0) {
          // Placeholder SVG em base64 para quando a imagem não carregar
          const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";

          infoHtml += `
            <h4>Informações de Acessibilidade</h4>
            <div class="accessibility-icons-grid">
              ${allCommentIcons.map(icon => `
                <div class="accessibility-icon-item">
                  <img 
                    src="${icon.icon_url || icon.image_url || icon.image || placeholderSvg}" 
                    alt="${icon.name}" 
                    title="${icon.name}"
                    class="accessibility-icon-img"
                    onerror="this.onerror=null; this.src='${placeholderSvg}'; this.classList.add('icon-placeholder');"
                  />
                  <span class="accessibility-icon-name">${icon.name}</span>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          infoHtml += '<p style="color: #9ca3af; font-size: 14px;">Nenhum item de acessibilidade informado</p>';
        }

        infoContent.innerHTML = infoHtml;
      } catch (error) {

        commentsList.innerHTML = "<p>Erro ao carregar comentários.</p>";
      }

      // =========================
      // 6. ABRIR O MODAL (Já aberto no início)
      // =========================
      // document.getElementById("infoModal").style.display = "block";
    } catch (error) {

    }
  }

  // Render de pins (chama locationService.getAll)
  async function renderPinsOnMap(map, W, H) {
    // Busca locations via API
    const pins = await locationService.getAll();
    // Salva no global para outras partes que precisarem (não sobrescrever)
    window.pins = pins || [];



    pins.forEach((p) => {
      const tipo = detectTypeFromName(p.name);
      const color = getColorForType(tipo);

      const top = parseFloat(p.top) || 0;
      const left = parseFloat(p.left) || 0;
      const x = (left / 100) * W;
      const y = (top / 100) * H;

      const marker = L.marker([y, x], {
        icon: makePinIcon(color, tipo, p.name),
      }).addTo(map);

      marker.on("click", async () => {
        // Usar os dados do pin diretamente (p), pois já contêm a descrição retornada pelo getAllLocations
        openLocationModal(p);
      });
    });

    // Ocultar loader após carregar pins
    const loader = document.getElementById("map-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }

  let mapLoaded = false;
  img.onload = async () => {
    if (mapLoaded) return;
    mapLoaded = true;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const bounds = [
      [0, 0],
      [H, W],
    ];

    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: 0.5,
      maxZoom: 2,
      zoomSnap: 0.25,
      attributionControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 0,
    });
    L.imageOverlay(imgUrl, bounds).addTo(map);
    map.fitBounds(bounds);

    const viewport = map.getSize();
    const zoomH = Math.log2(viewport.y / H);
    const zoomW = Math.log2(viewport.x / W);
    const fillZoom = Math.max(zoomH, zoomW);
    const baseZoom = fillZoom;
    map.setZoom(fillZoom);
    map.setMinZoom(fillZoom - 2);
    map.setMaxZoom(fillZoom + 1);

    // Keep pins scaled relative to the map zoom so they don't appear too large/small
    function updatePinScale() {
      const zoom = map.getZoom();
      const scale = Math.pow(2, zoom - baseZoom);

      document.documentElement.style.setProperty(
        "--pin-scale",
        Math.max(0.4, Math.min(scale, 1.6))
      );
    }
    updatePinScale();
    map.on("zoom", updatePinScale);

    // Botão personalizado removido

    // Renderiza os pins usando a API (apenas aqui)
    await renderPinsOnMap(map, W, H);

    // resize handling
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize(false);
        map.setView(center, zoom, { animate: false });
      }, 100);
    });
  };

  const pinTypes = {
    estacionamento: "pin-estacionamento",
    bloco: "pin-bloco",
    campo: "pin-campo",
    quadra: "pin-quadra",
    quadra_areia: "pin-quadra-areia",
    biblioteca: "pin-biblioteca",
    cantina: "pin-cantina",
    auditorio: "pin-auditorio",
    cores: "pin-cores",
    entrada: "pin-entrada",
    default: "pin-default",
  };

  img.onerror = () => {

    alert("Erro ao carregar a imagem do mapa. Verifique o caminho.");
  };

  // Iniciar carregamento da imagem após definir os handlers
  img.src = imgUrl;

  // --- UI: tabs, swiper, carousel init (mantidos) ---
  function initCustomCarousel() {
    /* ... seu código atual (sem mudanças) ... */
  }
  function initSwiperIfAvailable() {
    /* ... seu código atual (sem mudanças) ... */
  }
  initSwiperIfAvailable() || initCustomCarousel();

  // Tabs behaviour (mantido como você já tinha)
  (function initTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-pane");
    const tabWrapper = document.querySelector(".tab-content");
    if (tabWrapper) {
      tabWrapper.style.position = tabWrapper.style.position || "relative";
      tabWrapper.style.overflow = tabWrapper.style.overflow || "hidden";
    }
    tabContents.forEach((content, index) => {
      if (index === 0) {
        content.classList.add("active");
        content.classList.remove("enter-right", "exit-left");
      } else {
        content.classList.remove("active");
        content.classList.add("enter-right");
      }
    });
    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const current = document.querySelector(".tab-pane.active");
        const target = document.querySelector(
          `#${tab.id.replace("tab", "content")}`
        );
        if (!target || current === target) return;
        if (current) {
          current.classList.remove("active");
          current.classList.add("exit-left");
          const onEnd = (e) => {
            if (e.propertyName && e.propertyName.indexOf("transform") === -1)
              return;
            current.classList.remove("exit-left");
            current.removeEventListener("transitionend", onEnd);
          };
          current.addEventListener("transitionend", onEnd);
        }
        target.classList.remove("exit-left");
        target.classList.add("enter-right");
        // force repaint
        // eslint-disable-next-line no-unused-expressions
        target.offsetWidth;
        target.classList.add("active");
        target.classList.remove("enter-right");
        // REMOVIDO: loadCommentsForLocation aqui, pois já carregamos ao abrir o modal
      });
    });
  })();

  // Função para carregar comentários aprovados para um local (usa API)
  async function loadCommentsForLocation(locationId) {
    const commentsList = document.querySelector(".comments-list");
    if (!commentsList) return;
    commentsList.innerHTML = "<p>Carregando comentários...</p>";
    try {
      const response = await commentService.getApprovedByLocation(locationId);
      const comments = response.comments || response; // Adaptar conforme retorno
      if (!comments || comments.length === 0) {
        commentsList.innerHTML = "<p>Nenhum comentário ainda.</p>";
      } else {
        commentsList.innerHTML = comments
          .map(
            (comment) => `
          <div class="comment-card">
            <div class="comment-header">
              <span class="user-name">${comment.user_name}</span>
              <span class="comment-date">${new Date(
              comment.date
            ).toLocaleDateString("pt-BR")}</span>
            </div>
            <div class="comment-rating">${"⭐".repeat(
              comment.rating || 0
            )}</div>
            <p class="comment-text">${comment.comment}</p>
          </div>
        `
          )
          .join("");
      }
    } catch (error) {

      commentsList.innerHTML = "<p>Erro ao carregar comentários.</p>";
    }
  }

  // Helper: showMessageModal removido, usar showAlert
  // (Código removido)

  // Array para armazenar pins de acessibilidade adicionados nesta sessão
  let sessionAddedPins = [];

  // Controla o botão "Adicionar comentário"
  (function initCommentFlow() {
    const commentBtn = document.querySelector(".comment-btn");
    function setCommentButton(enabled) {
      if (!commentBtn) return;
      if (enabled) {
        commentBtn.classList.remove("hidden");
        commentBtn.classList.remove("disabled");
        commentBtn.disabled = false;
      } else {
        commentBtn.classList.add("hidden");
        commentBtn.classList.add("disabled");
        commentBtn.disabled = true;
      }
    }
    setCommentButton(
      document.querySelector("#review-content")?.classList.contains("active")
    );
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setTimeout(() => {
          const isReviewActive = document
            .querySelector("#review-content")
            ?.classList.contains("active");
          setCommentButton(!!isReviewActive);
        }, 0);
      });
    });

    // abrir modal de adicionar comentário
    if (commentBtn) {
      commentBtn.addEventListener("click", () => {
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        if (infoModal) infoModal.style.display = "none";
        if (addModal) addModal.style.display = "flex";
      });
    }

    // fechar add-comment modal
    const addCommentBackBtn = document.getElementById("btn-cancel-comment");
    if (addCommentBackBtn) {
      addCommentBackBtn.addEventListener("click", () => {
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        if (addModal) addModal.style.display = "none";
        if (infoModal) {
          infoModal.style.display = "flex";
          setTimeout(() => {
            infoModal.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 0);
        }
      });
    }

    // Função para mostrar seleção de ícones de acessibilidade dentro do modal de comentário
    async function showAccessibilityIconSelection() {
      // 1. Tornar a seção visível
      const pinsSelectionArea = document.getElementById("accessibility-pins-selection-area");
      const pinsListContainer = document.getElementById("pins-list-from-api");

      if (pinsSelectionArea) {
        pinsSelectionArea.style.display = "block";
      }

      if (!pinsListContainer) {

        return;
      }

      // 2. Mostrar estado de carregamento
      pinsListContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Carregando pins de acessibilidade...</div>';

      // 3. Buscar ícones da API
      let accessibilityIcons = [];
      try {
        try {
          accessibilityIcons = await commentService.getIcons();
        } catch (error) {
          throw new Error("Erro ao buscar ícones: " + error.message);
        }
      } catch (error) {

        pinsListContainer.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Erro ao carregar os pins.</div>';
        return;
      }

      // 4. Limpar contêiner e renderizar ícones
      pinsListContainer.innerHTML = '';

      if (accessibilityIcons.length === 0) {
        pinsListContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Nenhum pin de acessibilidade disponível.</div>';
        return;
      }

      // Criar grid de ícones
      const iconsGrid = document.createElement('div');
      iconsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 15px; padding: 10px 0;';

      // Função para atualizar a área de ícones selecionados
      function updateSelectedIconsArea() {
        const selectedArea = document.getElementById("selected-icons-area");
        const selectedList = document.getElementById("selected-icons-list");
        const selectedIdsInput = document.getElementById("selected-pin-ids");

        if (!selectedArea || !selectedList || !selectedIdsInput) return;

        const selectedIds = selectedIdsInput.value ? selectedIdsInput.value.split(",").filter(id => id) : [];

        if (selectedIds.length === 0) {
          selectedArea.style.display = "none";
          selectedList.innerHTML = "";
          return;
        }

        selectedArea.style.display = "block";
        selectedList.innerHTML = "";

        selectedIds.forEach(id => {
          const iconData = accessibilityIcons.find(i => String(i.id) === String(id));
          if (!iconData) return;

          const chip = document.createElement("div");
          chip.dataset.iconId = id;
          chip.style.cssText = `
            display: flex; align-items: center; gap: 6px; padding: 6px 10px;
            background: white; border: 1px solid #007bff; border-radius: 20px;
            font-size: 12px; color: #333;
          `;

          const iconImg = document.createElement("img");
          iconImg.src = iconData.url || iconData.icon_url || '/assets/icons/generic.svg';
          iconImg.style.cssText = "width: 20px; height: 20px; object-fit: contain;";

          const iconName = document.createElement("span");
          iconName.textContent = iconData.name || iconData.description || `Ícone ${id}`;

          const removeBtn = document.createElement("button");
          removeBtn.innerHTML = "×";
          removeBtn.style.cssText = `
            background: #ff4444; color: white; border: none; border-radius: 50%;
            width: 18px; height: 18px; cursor: pointer; font-size: 14px; line-height: 1;
            display: flex; align-items: center; justify-content: center;
          `;
          removeBtn.title = "Remover";
          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Remover do input
            const newIds = selectedIds.filter(i => i !== String(id));
            selectedIdsInput.value = newIds.join(",");
            // Atualizar visual do grid
            const gridIcon = document.querySelector(`#pins-list-from-api [data-pin-id="${id}"]`);
            if (gridIcon) {
              gridIcon.style.borderColor = "#ddd";
              gridIcon.style.backgroundColor = "transparent";
            }
            // Atualizar área de selecionados
            updateSelectedIconsArea();
          });

          chip.appendChild(iconImg);
          chip.appendChild(iconName);
          chip.appendChild(removeBtn);
          selectedList.appendChild(chip);
        });
      }

      accessibilityIcons.forEach((item, index) => {
        const iconId = item.id || `item-${index}`;
        const iconDiv = document.createElement("div");
        iconDiv.dataset.pinId = iconId;
        iconDiv.style.cssText = `
          display: flex; flex-direction: column; align-items: center; padding: 10px;
          border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s;
          background-color: transparent;
        `;

        const img = document.createElement("img");
        img.src = item.icon_url || item.url || item.image_url || item.image || '/assets/icons/generic.svg';
        img.alt = item.description || item.name || `Pin ID ${iconId}`;
        img.style.cssText = "width: 50px; height: 50px; margin-bottom: 5px; object-fit: contain;";

        const label = document.createElement("span");
        label.textContent = item.description || item.name || `Ícone ${index + 1}`;
        label.style.cssText = "font-size: 12px; text-align: center; font-weight: 500;";

        iconDiv.appendChild(img);
        iconDiv.appendChild(label);

        // Event listeners para hover effect
        iconDiv.addEventListener("mouseenter", () => {
          const selectedIdsInput = document.getElementById("selected-pin-ids");
          const selectedIds = selectedIdsInput?.value ? selectedIdsInput.value.split(",") : [];
          if (!selectedIds.includes(String(iconId))) {
            iconDiv.style.borderColor = "#007bff";
            iconDiv.style.backgroundColor = "#f0f8ff";
            iconDiv.style.transform = "scale(1.05)";
          }
        });

        iconDiv.addEventListener("mouseleave", () => {
          const selectedIdsInput = document.getElementById("selected-pin-ids");
          const selectedIds = selectedIdsInput?.value ? selectedIdsInput.value.split(",") : [];
          if (!selectedIds.includes(String(iconId))) {
            iconDiv.style.borderColor = "#ddd";
            iconDiv.style.backgroundColor = "transparent";
            iconDiv.style.transform = "scale(1)";
          }
        });

        // Event listener para seleção/desseleção (toggle)
        iconDiv.addEventListener("click", () => {
          const selectedIdsInput = document.getElementById("selected-pin-ids");
          if (!selectedIdsInput) return;

          let selectedIds = selectedIdsInput.value ? selectedIdsInput.value.split(",").filter(id => id) : [];
          const idStr = String(iconId);

          if (selectedIds.includes(idStr)) {
            // Desselecionar
            selectedIds = selectedIds.filter(id => id !== idStr);
            iconDiv.style.borderColor = "#ddd";
            iconDiv.style.backgroundColor = "transparent";
          } else {
            // Selecionar
            selectedIds.push(idStr);
            iconDiv.style.borderColor = "#007bff";
            iconDiv.style.backgroundColor = "#f0f8ff";
          }

          selectedIdsInput.value = selectedIds.join(",");
          updateSelectedIconsArea();
        });

        iconsGrid.appendChild(iconDiv);
      });

      pinsListContainer.appendChild(iconsGrid);
    }

    // 5. Event listener para o botão de adicionar pin de acessibilidade
    const btnAddAccessibilityPin = document.getElementById("btn-add-accessibility-pin");
    if (btnAddAccessibilityPin) {
      btnAddAccessibilityPin.addEventListener("click", showAccessibilityIconSelection);
    }

    // estrela rating
    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("rating");
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const value = star.getAttribute("data-value");
        ratingInput.value = value;
        stars.forEach((s) => {
          if (s.getAttribute("data-value") <= value) {
            s.classList.add("active");
            s.textContent = "★";
          } else {
            s.classList.remove("active");
            s.textContent = "☆";
          }
        });
      });
    });

    let selectedImages = [];

    // Função para validar formatos de imagem permitidos
    function isAllowedImageFile(file) {
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      return allowedExtensions.includes(fileExtension);
    }

    const imgInput = document.getElementById("comment-image");
    const fileList = document.getElementById("file-list");
    const btnAddImage = document.getElementById("btn-add-image");

    if (btnAddImage) {
      btnAddImage.addEventListener("click", () => {
        if (imgInput) imgInput.click();
      });
    }

    if (imgInput) {
      imgInput.addEventListener("change", () => {
        for (const file of imgInput.files) {
          if (file.size > 10485760) { // 10MB limit
            showAlert("Imagem muito grande. O tamanho máximo é 10MB.", "Erro");
            continue;
          }
          if (!isAllowedImageFile(file)) {
            const fileExtension = file.name.split('.').pop().toUpperCase();
            showAlert(`Arquivo rejeitado: "${file.name}"\n\nFormato ".${fileExtension}" não é permitido.\n\nUse apenas: PNG, JPG, JPEG, WEBP, HEIC ou HEIF.`, "Erro");
            continue;
          }
          selectedImages.push(file);
        }

        imgInput.value = "";
        renderFileList();
      });
    }

    function renderFileList() {
      fileList.innerHTML = "";

      selectedImages.forEach((file, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
      <span>${file.name}</span>
      <button data-index="${index}"
              style="
                background:red;
                color:white;
                border:none;
                padding:2px 6px;
                border-radius:4px;
                cursor:pointer;
              ">X</button>
    `;

        fileList.appendChild(li);
      });

      document.querySelectorAll("#file-list button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = btn.getAttribute("data-index");
          selectedImages.splice(i, 1);
          renderFileList();
        });
      });
    }

    // submit form de comentário
    const commentForm = document.getElementById("comment-form");
    if (commentForm) {
      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("user-name").value;
        const rating = ratingInput.value;
        const commentText = document.getElementById("comment-text").value;
        const imgInput = document.getElementById("imgInput");

        if (!name || name.trim() === "") {
          showAlert("Por favor, preencha seu nome.", "Erro");
          return;
        }

        if (!commentText || commentText.trim() === "") {
          showAlert("Por favor, digite seu comentário.", "Erro");
          return;
        }

        if (!rating || rating === "") {
          showAlert("Por favor, selecione uma avaliação com estrelas.", "Erro");
          return;
        }
        const commentData = {
          user_name: name,
          rating: parseInt(rating),
          comment: commentText,
          created_at: new Date().toISOString(),
          location_id: window.currentLocationId,
          status: "pending",
          images: selectedImages, // Passar o array de arquivos selecionados
        };

        // Adicionar comment_icon_ids se pins foram selecionados
        const selectedPinIds = document.getElementById("selected-pin-ids")?.value || "";
        if (selectedPinIds) {
          // Filtrar IDs numéricos válidos
          const validIds = selectedPinIds.split(",")
            .filter(id => id && !id.startsWith('item-'))
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

          if (validIds.length > 0) {
            commentData.comment_icon_ids = validIds;
          }
        }

        // NÃO sobrescrever window.pins — apenas chamar a API para enviar comentário
        const result = await commentService.create(commentData);
        if (result) {
          showAlert("Comentário enviado para aprovação!", "Sucesso");
        } else {
          showAlert("Erro ao enviar comentário. Tente novamente.", "Erro");
          return;
        }

        // reset visual do form
        commentForm.reset();
        stars.forEach((s) => {
          s.classList.remove("active");
          s.textContent = "☆";
        });
        ratingInput.value = "";

        // Reset da seleção de pins de acessibilidade
        const selectedPinIdsInput = document.getElementById("selected-pin-ids");
        const pinsSelectionArea = document.getElementById("accessibility-pins-selection-area");
        const pinsListContainer = document.getElementById("pins-list-from-api");
        const selectedIconsArea = document.getElementById("selected-icons-area");
        const selectedIconsList = document.getElementById("selected-icons-list");

        if (selectedPinIdsInput) {
          selectedPinIdsInput.value = "";
        }
        if (pinsSelectionArea) {
          pinsSelectionArea.style.display = "none";
        }
        if (pinsListContainer) {
          pinsListContainer.innerHTML = "";
        }
        if (selectedIconsArea) {
          selectedIconsArea.style.display = "none";
        }
        if (selectedIconsList) {
          selectedIconsList.innerHTML = "";
        }

        // fecha addCommentModal e reabre infoModal
        const addModal = document.getElementById(MODAL_IDS.addCommentModal);
        const infoModal = document.getElementById(MODAL_IDS.infoModal);
        if (addModal) addModal.style.display = "none";
        if (infoModal) infoModal.style.display = "flex";

        // aciona a aba de reviews para o usuário ver (loadCommentsForLocation será chamado quando a aba ficar ativa)
        const reviewTab = document.getElementById("review-tab");
        if (reviewTab) reviewTab.click();
      });
    }
  })();

  // Back button navbar behavior
  const navBack = document.querySelector(".btn.voltar");
  if (navBack) {
    navBack.addEventListener("click", function (e) {
      const modal = document.getElementById(MODAL_IDS.infoModal);
      const addModal = document.getElementById(MODAL_IDS.addCommentModal);
      if (addModal && addModal.style.display === "flex") {
        e.preventDefault();
        addModal.style.display = "none";
        if (modal) modal.style.display = "flex";
      } else if (modal && modal.style.display === "flex") {
        e.preventDefault();
        modal.style.display = "none";
        inModal = false;
        if (modalPushed) {
          try {
            history.back();
          } catch (err) {
            /* ignore */
          }
          modalPushed = false;
        }
      }
    });
  }

  // popstate handler
  window.addEventListener("popstate", function () {
    if (inModal) {
      const modal = document.getElementById(MODAL_IDS.infoModal);
      if (modal) modal.style.display = "none";
      inModal = false;
      modalPushed = false;
    }
  });
});
