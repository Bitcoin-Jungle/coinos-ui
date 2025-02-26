<script>
  import { onMount } from "svelte";
  import { t } from "$lib/translations";
  import { post, get, fail, success } from "$lib/utils";
  import Icon from "$comp/Icon.svelte";
  import Spinner from "$comp/Spinner.svelte";

  let { data } = $props();
  let { user } = $derived(data);

  // State variables
  let cards = $state([]);
  let loading = $state(true);
  let creating = $state(false);
  let showCreateForm = $state(false);
  let showQRCode = $state(false);
  let pairingQRCode = $state("");
  let selectedCard = $state(null);
  let showProgramData = $state(false);
  let programData = $state(null);
  let showCardDetails = $state(false);
  let cardDetails = $state(null);

  // Form fields for creating a new card
  let newCardName = $state("");
  let newCardTxLimit = $state(50000); // Default 50k sats
  let newCardDayLimit = $state(200000); // Default 200k sats

  // Load user's Bolt Cards
  async function loadCards() {
    try {
      loading = true;
      console.log("Loading bolt cards...");
      const response = await fetch("/api/boltcard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Bolt cards data:", data);
      
      // Handle different response formats
      if (data === null || data === undefined) {
        // If the response is null or undefined, set cards to empty array
        cards = [];
      } else if (data.cards) {
        // If the response has a cards property
        cards = Array.isArray(data.cards) ? data.cards : [];
      } else if (Array.isArray(data)) {
        // If the response is an array
        cards = data;
      } else {
        // If the response is a single card object
        cards = [data];
      }
      
      console.log("Processed cards:", cards);
      loading = false;
    } catch (error) {
      console.error("Error loading bolt cards:", error);
      fail(error.message || $t("user.boltcard.error.load"));
      loading = false;
    }
  }

  // Create a new Bolt Card
  async function createCard(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      if (!newCardName) {
        fail($t("user.boltcard.cardName") + " " + $t("is required"));
        return;
      }

      creating = true;
      
      const response = await fetch("/api/boltcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newCardName,
          tx_limit_sats: newCardTxLimit,
          day_limit_sats: newCardDayLimit
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const card = await response.json();
      cards = [...cards, card.card];
      success($t("user.boltcard.success.created"));
      
      // Reset form
      newCardName = "";
      newCardTxLimit = 50000;
      newCardDayLimit = 200000;
      showCreateForm = false;
      creating = false;
    } catch (error) {
      fail(error.message || $t("user.boltcard.error.create"));
      creating = false;
    }
  }

  // Update a Bolt Card
  async function updateCard(card) {
    try {
      const response = await fetch(`/api/boltcard/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: card.name,
          tx_limit_sats: card.tx_limit_sats,
          day_limit_sats: card.day_limit_sats,
          status: card.status
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedCard = await response.json();
      cards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
      success($t("user.boltcard.success.updated"));
    } catch (error) {
      fail(error.message || $t("user.boltcard.error.update"));
    }
  }

  // Get a specific Bolt Card
  async function getCard(cardId) {
    try {
      loading = true;
      console.log("Getting card details for ID:", cardId);
      
      const response = await fetch(`/api/boltcard/${cardId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      console.log("Get card response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const card = await response.json();
      console.log("Card details:", card);
      
      // Update the card in the list
      cards = cards.map(c => c.id === card.id ? card : c);
      loading = false;
      return card;
    } catch (error) {
      console.error("Error getting card details:", error);
      fail(error.message || $t("user.boltcard.error.get"));
      loading = false;
      return null;
    }
  }

  // Delete a Bolt Card
  async function deleteCard(cardId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!confirm($t("user.boltcard.confirmDelete"))) return;

    try {
      console.log("Deleting card with ID:", cardId);
      loading = true;
      
      const response = await fetch(`/api/boltcard/${cardId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      console.log("Delete card response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Remove the deleted card from the list
      cards = cards.filter(c => c.id !== cardId);
      success($t("user.boltcard.success.deleted"));
      loading = false;
    } catch (error) {
      console.error("Error deleting card:", error);
      fail(error.message || $t("user.boltcard.error.delete"));
      loading = false;
    }
  }

  // Toggle card status (active/disabled)
  async function toggleCardStatus(card, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const newStatus = card.status === "active" ? "disabled" : "active";
      
      const response = await fetch(`/api/boltcard/${card.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedCard = await response.json();
      cards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
      success(newStatus === "active" 
        ? $t("user.boltcard.success.activated") 
        : $t("user.boltcard.success.disabled"));
    } catch (error) {
      fail(error.message || $t("user.boltcard.error.status"));
    }
  }

  // Generate pairing QR code
  async function generatePairingQR(card, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      selectedCard = card;
      console.log("Generating pairing QR for card:", card);
      loading = true;
      
      // For pairing, we need to generate a temporary UID if one doesn't exist
      // This will be replaced with the actual UID when the card is paired
      const generateRandomHex = (length) => {
        const characters = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };
      
      const tempUid = card.uid || generateRandomHex(14);
      
      // First, get the programming data for the card
      const programResponse = await fetch(`/api/boltcard/${card.id}/program`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!programResponse.ok) {
        throw new Error(`HTTP error! status: ${programResponse.status}`);
      }
      
      const programData = await programResponse.json();
      console.log("Card programming data:", programData);
      
      // Then, initiate the pairing process
      const pairResponse = await fetch(`/api/boltcard/pair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          id: card.id,
          uid: tempUid
        })
      });
      
      console.log("Pairing response status:", pairResponse.status);
      
      if (!pairResponse.ok) {
        throw new Error(`HTTP error! status: ${pairResponse.status}`);
      }
      
      const pairData = await pairResponse.json();
      console.log("Pairing response data:", pairData);
      
      // Use the QR code from the programming data if available, otherwise use the pairing response
      pairingQRCode = programData.qrCode || pairData.qrCode || programData.url || pairData.url;
      
      if (!pairingQRCode) {
        throw new Error("No QR code found in the response");
      }
      
      showQRCode = true;
      loading = false;
    } catch (error) {
      console.error("Error generating pairing QR:", error);
      fail(error.message || $t("user.boltcard.error.pair"));
      loading = false;
    }
  }

  // Get card programming data
  async function getCardProgramData(cardId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      loading = true;
      const response = await fetch(`/api/boltcard/${cardId}/program`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      programData = await response.json();
      console.log("Card programming data:", programData);
      
      // Ensure we have a QR code URL to display
      // Try different possible fields that might contain QR code data
      if (!programData.qrCode) {
        // Check for common QR code field names
        const possibleFields = ['url', 'qr_code', 'qrcode', 'pairing_url', 'pairingUrl', 'qr'];
        
        for (const field of possibleFields) {
          if (programData[field]) {
            programData.qrCode = programData[field];
            break;
          }
        }
        
        // Check nested data object if present
        if (!programData.qrCode && programData.data) {
          for (const field of possibleFields) {
            if (programData.data[field]) {
              programData.qrCode = programData.data[field];
              break;
            }
          }
        }
      }
      
      // If we still don't have a QR code, create a compact version of the data
      if (!programData.qrCode) {
        // Create a simplified version with just the essential fields to keep QR code manageable
        const essentialData = {
          id: programData.id,
          name: programData.name,
          uid: programData.uid,
          tx_limit_sats: programData.tx_limit_sats,
          day_limit_sats: programData.day_limit_sats
        };
        programData.qrCode = JSON.stringify(essentialData);
      }
      
      showProgramData = true;
      loading = false;
      
      return programData;
    } catch (error) {
      console.error("Error getting card programming data:", error);
      fail(error.message || $t("user.boltcard.error.program"));
      loading = false;
      return null;
    }
  }

  // Format QR code data to ensure it's not too large
  function formatQRData(data) {
    if (!data) return '';
    
    // If it's already a string and not too long, use it directly
    if (typeof data === 'string' && data.length < 500) {
      return data;
    }
    
    // For objects or long strings, create a compact version
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      const essentialData = {
        id: obj.id,
        name: obj.name,
        uid: obj.uid,
        tx_limit_sats: obj.tx_limit_sats,
        day_limit_sats: obj.day_limit_sats
      };
      return JSON.stringify(essentialData);
    } catch (e) {
      // If parsing fails, truncate the string
      return typeof data === 'string' 
        ? data.substring(0, 500) 
        : JSON.stringify(data).substring(0, 500);
    }
  }

  // Load card balance and daily spending
  async function loadCardBalance(cardId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const response = await fetch(`/api/boltcard/balance/${cardId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const balance = await response.json();
      cards = cards.map(c => {
        if (c.id === cardId) {
          return { ...c, daily_spent: balance.daily_spent };
        }
        return c;
      });
    } catch (error) {
      fail(error.message || $t("user.boltcard.error.balance"));
    }
  }

  // Format satoshi amount with commas
  function formatSats(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Toggle create form visibility
  function toggleCreateForm(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showCreateForm = !showCreateForm;
  }

  // Close QR code modal
  function closeQRModal(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showQRCode = false;
    pairingQRCode = "";
  }

  // Close program data modal
  function closeProgramDataModal(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showProgramData = false;
    programData = null;
  }

  // View card details
  async function viewCardDetails(cardId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const card = await getCard(cardId);
    if (card) {
      cardDetails = card;
      showCardDetails = true;
    }
  }

  // Close card details modal
  function closeCardDetailsModal(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showCardDetails = false;
    cardDetails = null;
  }

  // Initialize the component
  onMount(() => {
    console.log("Component mounted, calling loadCards()");
    // Add a small delay to ensure the component is fully mounted
    setTimeout(() => {
      loadCards();
    }, 100);
  });
</script>

<!-- Wrap everything in a div to isolate from parent form -->
<div class="boltcard-manager">
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">{$t("user.boltcard.title")}</h2>
      <button 
        type="button"
        class="btn btn-sm btn-primary" 
        on:click|preventDefault|stopPropagation={toggleCreateForm}
      >
        {showCreateForm ? $t("user.boltcard.cancel") : $t("user.boltcard.createNew")}
      </button>
    </div>

    {#if showCreateForm}
      <div class="card bg-base-200 p-4 shadow-md">
        <h3 class="text-xl font-semibold mb-4">{$t("user.boltcard.createNew")}</h3>
        <div class="space-y-4">
          <div>
            <label for="cardName" class="block font-medium mb-1">{$t("user.boltcard.cardName")}</label>
            <input 
              type="text" 
              id="cardName" 
              class="input input-bordered w-full" 
              bind:value={newCardName} 
              placeholder={$t("user.boltcard.cardName")}
            />
          </div>
          
          <div>
            <label for="txLimit" class="block font-medium mb-1">{$t("user.boltcard.txLimit")} (sats)</label>
            <input 
              type="number" 
              id="txLimit" 
              class="input input-bordered w-full" 
              bind:value={newCardTxLimit} 
              min="1000"
            />
            <p class="text-sm text-secondary mt-1">{$t("user.boltcard.txLimitDesc")}</p>
          </div>
          
          <div>
            <label for="dayLimit" class="block font-medium mb-1">{$t("user.boltcard.dayLimit")} (sats)</label>
            <input 
              type="number" 
              id="dayLimit" 
              class="input input-bordered w-full" 
              bind:value={newCardDayLimit} 
              min="1000"
            />
            <p class="text-sm text-secondary mt-1">{$t("user.boltcard.dayLimitDesc")}</p>
          </div>
          
          <div class="flex justify-end">
            <button 
              type="button"
              class="btn btn-sm btn-primary" 
              on:click|preventDefault|stopPropagation={createCard} 
              disabled={creating}
            >
              {#if creating}
                <Spinner />
              {:else}
                {$t("user.boltcard.create")}
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="flex justify-center py-8">
        <Spinner />
      </div>
    {:else if cards.length === 0}
      <div class="text-center py-8">
        <p class="text-secondary">{$t("user.boltcard.noCards")}</p>
        <p class="mt-2">{$t("user.boltcard.addFirst")}</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each cards as card}
          <div class="card bg-base-200 p-4 shadow-md">
            <div class="flex flex-col md:flex-row md:justify-between gap-2">
              <div>
                <h3 class="text-xl font-semibold">{card.name}</h3>
                <div class="mt-1">
                  <span class="badge badge-sm {card.status === 'active' ? 'badge-success' : 'badge-error'}">
                    {card.status === 'active' ? $t("user.boltcard.active") : $t("user.boltcard.disabled")}
                  </span>
                  {#if card.uid}
                    <span class="badge badge-sm badge-info ml-2">{$t("user.boltcard.paired")}</span>
                  {:else}
                    <span class="badge badge-sm badge-warning ml-2">{$t("user.boltcard.notPaired")}</span>
                  {/if}
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                <button 
                  type="button"
                  class="btn btn-xs {card.status === 'active' ? 'btn-error' : 'btn-success'}" 
                  on:click|preventDefault|stopPropagation={(e) => toggleCardStatus(card, e)}
                  title={card.status === 'active' ? $t("user.boltcard.disable") : $t("user.boltcard.enable")}
                >
                  {card.status === 'active' ? $t("user.boltcard.disable") : $t("user.boltcard.enable")}
                </button>
                <button 
                  type="button"
                  class="btn btn-xs btn-primary" 
                  on:click|preventDefault|stopPropagation={(e) => generatePairingQR(card, e)}
                  disabled={!!card.uid}
                  title={card.uid ? $t("user.boltcard.alreadyPaired") : $t("user.boltcard.pairCard")}
                >
                  {card.uid ? $t("user.boltcard.alreadyPaired") : $t("user.boltcard.pairCard")}
                </button>
                <button 
                  type="button"
                  class="btn btn-xs btn-info" 
                  on:click|preventDefault|stopPropagation={(e) => getCardProgramData(card.id, e)}
                  title={$t("user.boltcard.programData")}
                >
                  {$t("user.boltcard.programData")}
                </button>
                <button 
                  type="button"
                  class="btn btn-xs btn-secondary" 
                  on:click|preventDefault|stopPropagation={(e) => viewCardDetails(card.id, e)}
                  title={$t("user.boltcard.details")}
                >
                  {$t("user.boltcard.details")}
                </button>
                <button 
                  type="button"
                  class="btn btn-xs btn-error" 
                  on:click|preventDefault|stopPropagation={(e) => deleteCard(card.id, e)}
                  title={$t("user.boltcard.delete")}
                >
                  {$t("user.boltcard.delete")}
                </button>
              </div>
            </div>
            
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-secondary">{$t("user.boltcard.txLimit")}</p>
                <p class="font-medium">{formatSats(card.tx_limit_sats)} sats</p>
              </div>
              <div>
                <p class="text-sm text-secondary">{$t("user.boltcard.dayLimit")}</p>
                <p class="font-medium">{formatSats(card.day_limit_sats)} sats</p>
              </div>
              {#if card.uid}
                <div>
                  <p class="text-sm text-secondary">{$t("user.boltcard.uid")}</p>
                  <p class="font-medium font-mono text-xs">{card.uid}</p>
                </div>
              {/if}
              <div>
                <p class="text-sm text-secondary">{$t("user.boltcard.created")}</p>
                <p class="font-medium">{new Date(card.created).toLocaleDateString()}</p>
              </div>
            </div>
            
            {#if card.uid}
              <div class="mt-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-secondary">{$t("user.boltcard.dailyUsage")}</p>
                    <p class="font-medium">
                      <span class="font-bold">{formatSats(card.daily_spent || 0)}</span> / {formatSats(card.day_limit_sats)} sats
                    </p>
                  </div>
                  <button 
                    type="button"
                    class="btn btn-xs" 
                    on:click|preventDefault|stopPropagation={(e) => loadCardBalance(card.id, e)}
                    title={$t("user.boltcard.refresh")}
                  >
                    {$t("user.boltcard.refresh")}
                  </button>
                </div>
                <div class="w-full bg-base-300 rounded-full h-2.5 mt-2">
                  <div 
                    class="bg-primary h-2.5 rounded-full" 
                    style="width: {Math.min(100, ((card.daily_spent || 0) / card.day_limit_sats) * 100)}%"
                  ></div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if showQRCode && pairingQRCode}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-base-100 p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        <h3 class="text-xl font-bold mb-4">{$t("user.boltcard.pairTitle")}</h3>
        <p class="mb-4">{$t("user.boltcard.pairInstructions")}</p>
        
        <div class="flex justify-center mb-4">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formatQRData(pairingQRCode))}`} 
            alt="Pairing QR Code" 
            class="w-64 h-64 border-2 border-base-300"
          />
        </div>
        
        <div class="text-center mt-4">
          <p class="text-xs mb-2 break-all bg-base-200 p-2 rounded">{formatQRData(pairingQRCode)}</p>
          <button 
            type="button"
            class="btn btn-sm btn-primary mt-2" 
            on:click|preventDefault|stopPropagation={closeQRModal}
          >
            {$t("user.boltcard.close")}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showProgramData && programData}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-base-100 p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
        <h3 class="text-xl font-bold mb-4">{$t("user.boltcard.programDataTitle")}</h3>
        <p class="mb-4">{$t("user.boltcard.programDataInstructions")}</p>
        
        <div class="flex justify-center mb-4">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formatQRData(programData.qrCode))}`} 
            alt="Programming QR Code" 
            class="w-64 h-64 border-2 border-base-300"
          />
        </div>
        
        <div class="text-center mb-4">
          <p class="text-xs break-all bg-base-200 p-2 rounded">{formatQRData(programData.qrCode).substring(0, 100) + '...'}</p>
        </div>
        
        <div class="overflow-auto max-h-64 mb-4 bg-base-200 p-4 rounded">
          <pre class="text-xs whitespace-pre-wrap">{JSON.stringify(programData, null, 2)}</pre>
        </div>
        
        <div class="text-center">
          <button 
            type="button"
            class="btn btn-sm btn-primary" 
            on:click|preventDefault|stopPropagation={closeProgramDataModal}
          >
            {$t("user.boltcard.close")}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showCardDetails && cardDetails}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-base-100 p-6 rounded-lg max-w-lg w-full">
        <h3 class="text-xl font-bold mb-4">{$t("user.boltcard.cardDetails")}</h3>
        
        <div class="space-y-4 mb-6">
          <div>
            <label for="detailCardName" class="block font-medium mb-1">{$t("user.boltcard.cardName")}</label>
            <input 
              type="text" 
              id="detailCardName" 
              class="input input-bordered w-full" 
              bind:value={cardDetails.name} 
            />
          </div>
          
          <div>
            <label for="detailTxLimit" class="block font-medium mb-1">{$t("user.boltcard.txLimit")} (sats)</label>
            <input 
              type="number" 
              id="detailTxLimit" 
              class="input input-bordered w-full" 
              bind:value={cardDetails.tx_limit_sats} 
              min="1000"
            />
          </div>
          
          <div>
            <label for="detailDayLimit" class="block font-medium mb-1">{$t("user.boltcard.dayLimit")} (sats)</label>
            <input 
              type="number" 
              id="detailDayLimit" 
              class="input input-bordered w-full" 
              bind:value={cardDetails.day_limit_sats} 
              min="1000"
            />
          </div>
          
          <div>
            <label for="detailStatus" class="block font-medium mb-1">{$t("user.boltcard.status")}</label>
            <select 
              id="detailStatus" 
              class="select select-bordered w-full" 
              bind:value={cardDetails.status}
            >
              <option value="active">{$t("user.boltcard.active")}</option>
              <option value="disabled">{$t("user.boltcard.disabled")}</option>
            </select>
          </div>
          
          {#if cardDetails.uid}
            <div>
              <label class="block font-medium mb-1">{$t("user.boltcard.uid")}</label>
              <p class="font-mono text-xs bg-base-200 p-2 rounded">{cardDetails.uid}</p>
            </div>
          {/if}
          
          <div>
            <label class="block font-medium mb-1">{$t("user.boltcard.created")}</label>
            <p>{new Date(cardDetails.created).toLocaleString()}</p>
          </div>
          
          {#if cardDetails.last_used}
            <div>
              <label class="block font-medium mb-1">{$t("user.boltcard.lastUsed")}</label>
              <p>{new Date(cardDetails.last_used).toLocaleString()}</p>
            </div>
          {/if}
        </div>
        
        <div class="flex justify-between">
          <button 
            type="button"
            class="btn btn-sm btn-secondary" 
            on:click|preventDefault|stopPropagation={closeCardDetailsModal}
          >
            {$t("user.boltcard.cancel")}
          </button>
          
          <button 
            type="button"
            class="btn btn-sm btn-primary" 
            on:click|preventDefault|stopPropagation={() => {
              updateCard(cardDetails);
              closeCardDetailsModal();
            }}
          >
            {$t("user.boltcard.save")}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Isolate this component from parent styles */
  .boltcard-manager {
    position: relative;
    z-index: 1;
  }
  
  /* Make buttons more compact on mobile */
  @media (max-width: 768px) {
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    
    /* Improve mobile layout */
    .card {
      padding: 0.75rem !important;
    }
    
    /* Stack buttons vertically on very small screens */
    @media (max-width: 480px) {
      .flex-wrap {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .btn-xs {
        width: 100%;
      }
    }
  }
</style> 