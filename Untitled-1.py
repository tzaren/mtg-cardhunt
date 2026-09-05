#!/usr/bin/env python3
"""
MTG Pärmguide - Organisera din kortjakt efter set!

Tar en lista med kortnamn och skapar en guide sorterad på set,
med Cardmarket price-trend för varje printing.

Användning:
    python mtg_parmguide.py kortlista.txt
    python mtg_parmguide.py  # Interaktivt läge
"""

import requests
import time
import json
import sys
from collections import defaultdict
from typing import Optional

# Scryfall API kräver User-Agent
HEADERS = {
    "User-Agent": "MTGParmguide/1.0",
    "Accept": "application/json"
}

# Rate limiting: max 10 req/sek enligt Scryfall docs
REQUEST_DELAY = 0.1


def search_card_printings(card_name: str) -> list[dict]:
    """
    Söker efter alla printings av ett kort via Scryfall.
    Returnerar lista med alla versioner.
    """
    # Använd "prints" för att få alla versioner
    url = "https://api.scryfall.com/cards/search"
    params = {
        "q": f'!"{card_name}"',  # Exakt matchning
        "unique": "prints",      # Alla printings
        "order": "released",     # Nyast först
    }
    
    all_cards = []
    
    try:
        while url:
            response = requests.get(url, params=params, headers=HEADERS)
            time.sleep(REQUEST_DELAY)
            
            if response.status_code == 404:
                print(f"  ⚠️  Hittade inte: {card_name}")
                return []
            
            response.raise_for_status()
            data = response.json()
            
            all_cards.extend(data.get("data", []))
            
            # Hantera paginering
            if data.get("has_more"):
                url = data.get("next_page")
                params = {}  # Params finns redan i next_page URL
            else:
                url = None
                
    except requests.RequestException as e:
        print(f"  ❌ API-fel för {card_name}: {e}")
        return []
    
    return all_cards


def extract_card_info(card_data: dict) -> dict:
    """
    Extraherar relevant info från Scryfall-data.
    """
    prices = card_data.get("prices", {})
    
    # Cardmarket price-trend (EUR)
    eur_price = prices.get("eur")
    eur_foil_price = prices.get("eur_foil")
    
    return {
        "name": card_data.get("name"),
        "set_code": card_data.get("set", "").upper(),
        "set_name": card_data.get("set_name"),
        "collector_number": card_data.get("collector_number"),
        "rarity": card_data.get("rarity", "").capitalize(),
        "eur_price": float(eur_price) if eur_price else None,
        "eur_foil_price": float(eur_foil_price) if eur_foil_price else None,
        "cardmarket_url": card_data.get("purchase_uris", {}).get("cardmarket"),
        "scryfall_url": card_data.get("scryfall_uri"),
        "released_at": card_data.get("released_at"),
        "frame": card_data.get("frame"),
        "border_color": card_data.get("border_color"),
    }


def is_standard_printing(card: dict) -> bool:
    """
    Filtrera bort tokens, art cards, etc.
    Behåll bara "riktiga" kort.
    """
    # Skippa promo-versioner om de inte har pris
    if card["eur_price"] is None and card["eur_foil_price"] is None:
        return False
    return True


def build_set_guide(card_names: list[str], 
                    preferred_sets: Optional[list[str]] = None,
                    max_price: Optional[float] = None,
                    cheapest_only: bool = False) -> dict:
    """
    Bygger en guide organiserad efter set.
    
    Args:
        card_names: Lista med kortnamn att söka
        preferred_sets: Prioritera dessa set (t.ex. ["MH2", "2XM"])
        max_price: Max pris i EUR
        cheapest_only: Visa bara billigaste printingen per kort
    
    Returns:
        Dict med set_code -> lista av kort
    """
    set_guide = defaultdict(list)
    card_summary = {}  # För att spåra billigaste per kort
    
    print(f"\n🔍 Söker efter {len(card_names)} kort...\n")
    
    for i, card_name in enumerate(card_names, 1):
        card_name = card_name.strip()
        if not card_name or card_name.startswith("#"):
            continue
            
        print(f"[{i}/{len(card_names)}] {card_name}...")
        
        printings = search_card_printings(card_name)
        
        if not printings:
            continue
        
        valid_printings = []
        
        for printing in printings:
            info = extract_card_info(printing)
            
            if not is_standard_printing(info):
                continue
                
            # Prisfilter
            if max_price and info["eur_price"] and info["eur_price"] > max_price:
                continue
            
            valid_printings.append(info)
        
        if not valid_printings:
            print(f"  ⚠️  Inga giltiga printings för {card_name}")
            continue
        
        # Hitta billigaste
        priced_printings = [p for p in valid_printings if p["eur_price"]]
        if priced_printings:
            cheapest = min(priced_printings, key=lambda x: x["eur_price"])
            card_summary[card_name] = cheapest
        
        # Lägg till i set-guiden
        for info in valid_printings:
            if cheapest_only and priced_printings:
                if info != cheapest:
                    continue
            set_guide[info["set_code"]].append(info)
        
        print(f"  ✓ Hittade {len(valid_printings)} printings")
    
    return dict(set_guide), card_summary


def format_price(price: Optional[float]) -> str:
    """Formatera pris snyggt."""
    if price is None:
        return "N/A"
    return f"{price:.2f}€"


def print_set_guide(set_guide: dict, card_summary: dict):
    """
    Skriver ut guiden formaterad för pärmjakt.
    """
    if not set_guide:
        print("\n❌ Inga kort hittades!")
        return
    
    # Sortera set efter antal kort (mest kort först)
    sorted_sets = sorted(set_guide.items(), key=lambda x: len(x[1]), reverse=True)
    
    total_cards = sum(len(cards) for cards in set_guide.values())
    unique_cards = len(card_summary)
    
    print("\n" + "="*60)
    print("📚 PÄRMGUIDE - Organiserad efter Set")
    print("="*60)
    
    # Sammanfattning
    if card_summary:
        total_min_cost = sum(c["eur_price"] for c in card_summary.values() if c["eur_price"])
        print(f"\n💰 Totalt (billigaste printings): {total_min_cost:.2f}€")
        print(f"📊 {unique_cards} unika kort, {total_cards} printings i {len(set_guide)} set\n")
    
    for set_code, cards in sorted_sets:
        set_name = cards[0]["set_name"] if cards else set_code
        
        print(f"\n{'─'*60}")
        print(f"📁 {set_code} - {set_name} ({len(cards)} kort)")
        print(f"{'─'*60}")
        
        # Sortera kort inom set efter pris
        sorted_cards = sorted(cards, key=lambda x: x["eur_price"] or 999)
        
        for card in sorted_cards:
            price_str = format_price(card["eur_price"])
            foil_str = f" (foil: {format_price(card['eur_foil_price'])})" if card["eur_foil_price"] else ""
            
            # Markera billigaste printingen
            is_cheapest = (card["name"] in card_summary and 
                          card_summary[card["name"]]["set_code"] == card["set_code"] and
                          card_summary[card["name"]]["collector_number"] == card["collector_number"])
            
            marker = "⭐" if is_cheapest else "  "
            
            print(f"{marker} {card['name']}")
            print(f"      #{card['collector_number']} | {card['rarity']} | {price_str}{foil_str}")


def export_to_csv(set_guide: dict, filename: str = "parmguide.csv"):
    """
    Exportera till CSV för vidare bearbetning.
    """
    import csv
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "Set Code", "Set Name", "Card Name", "Collector #", 
            "Rarity", "Price (EUR)", "Foil Price (EUR)", "Cardmarket URL"
        ])
        
        for set_code in sorted(set_guide.keys()):
            for card in sorted(set_guide[set_code], key=lambda x: x["name"]):
                writer.writerow([
                    card["set_code"],
                    card["set_name"],
                    card["name"],
                    card["collector_number"],
                    card["rarity"],
                    card["eur_price"] or "",
                    card["eur_foil_price"] or "",
                    card["cardmarket_url"] or ""
                ])
    
    print(f"\n📄 Exporterat till {filename}")


def export_to_markdown(set_guide: dict, card_summary: dict, filename: str = "parmguide.md"):
    """
    Exportera till Markdown för snygg visning.
    """
    sorted_sets = sorted(set_guide.items(), key=lambda x: len(x[1]), reverse=True)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("# 📚 MTG Pärmguide\n\n")
        
        # Sammanfattning
        if card_summary:
            total_min_cost = sum(c["eur_price"] for c in card_summary.values() if c["eur_price"])
            f.write(f"**Totalt (billigaste printings):** {total_min_cost:.2f}€  \n")
            f.write(f"**Antal unika kort:** {len(card_summary)}  \n")
            f.write(f"**Antal set att kolla:** {len(set_guide)}\n\n")
        
        f.write("---\n\n")
        
        for set_code, cards in sorted_sets:
            set_name = cards[0]["set_name"] if cards else set_code
            f.write(f"## {set_code} - {set_name} ({len(cards)} kort)\n\n")
            f.write("| Kort | # | Rarity | Pris | Foil |\n")
            f.write("|------|---|--------|------|------|\n")
            
            for card in sorted(cards, key=lambda x: x["eur_price"] or 999):
                is_cheapest = (card["name"] in card_summary and 
                              card_summary[card["name"]]["set_code"] == card["set_code"])
                marker = "⭐ " if is_cheapest else ""
                
                f.write(f"| {marker}{card['name']} | {card['collector_number']} | "
                       f"{card['rarity']} | {format_price(card['eur_price'])} | "
                       f"{format_price(card['eur_foil_price'])} |\n")
            
            f.write("\n")
    
    print(f"\n📄 Exporterat till {filename}")


def interactive_mode():
    """
    Interaktivt läge för att mata in kort.
    """
    print("\n🎴 MTG Pärmguide - Interaktivt läge")
    print("="*40)
    print("Skriv in kortnamn, ett per rad.")
    print("Avsluta med en tom rad.\n")
    
    cards = []
    while True:
        try:
            line = input("> ").strip()
            if not line:
                break
            cards.append(line)
        except EOFError:
            break
    
    return cards


def parse_cardmarket_wantlist(csv_content: str) -> dict:
    """
    Parsar en exporterad Cardmarket wants-lista.
    Returnerar set_guide-format direkt.
    """
    import csv
    from io import StringIO
    
    set_guide = defaultdict(list)
    card_summary = {}
    
    reader = csv.DictReader(StringIO(csv_content), delimiter=';')
    
    for row in reader:
        # Cardmarket CSV har typiskt: idProduct, Name, Expansion, etc.
        name = row.get('Name', row.get('Card Name', '')).strip()
        expansion = row.get('Expansion', row.get('Set', '')).strip()
        
        # Försök hitta pris-info
        price_str = row.get('Price', row.get('Trend', row.get('Price Trend', ''))).strip()
        try:
            price = float(price_str.replace(',', '.').replace('€', '').strip()) if price_str else None
        except ValueError:
            price = None
        
        if not name:
            continue
        
        info = {
            "name": name,
            "set_code": expansion[:3].upper() if expansion else "???",
            "set_name": expansion,
            "collector_number": row.get('Collector Number', row.get('Number', 'N/A')),
            "rarity": row.get('Rarity', 'Unknown'),
            "eur_price": price,
            "eur_foil_price": None,
            "cardmarket_url": None,
            "scryfall_url": None,
        }
        
        set_guide[info["set_code"]].append(info)
        
        # Spåra billigaste
        if name not in card_summary or (price and card_summary[name].get("eur_price", 999) > price):
            card_summary[name] = info
    
    return dict(set_guide), card_summary


def print_usage():
    """Skriv ut hjälptext."""
    print("""
🎴 MTG Pärmguide - Organisera din kortjakt!
============================================

ANVÄNDNING:
    python mtg_parmguide.py                     # Interaktivt läge
    python mtg_parmguide.py kortlista.txt       # Läs kortnamn från fil
    python mtg_parmguide.py --cardmarket fil.csv # Importera Cardmarket export

KORTLISTA-FORMAT (en rad per kort):
    Lightning Bolt
    Counterspell
    # Kommentarer börjar med #
    Sol Ring

CARDMARKET EXPORT:
    1. Gå till cardmarket.com och skapa en Wants-lista
    2. Exportera listan som CSV
    3. Kör: python mtg_parmguide.py --cardmarket din_lista.csv

OUTPUT:
    - parmguide.csv  : Fullständig data för vidare bearbetning
    - parmguide.md   : Snygg Markdown för utskrift/visning
    """)


def main():
    # Hantera --help
    if "--help" in sys.argv or "-h" in sys.argv:
        print_usage()
        sys.exit(0)
    
    # Hantera Cardmarket-import
    if "--cardmarket" in sys.argv:
        idx = sys.argv.index("--cardmarket")
        if idx + 1 >= len(sys.argv):
            print("❌ Ange en CSV-fil efter --cardmarket")
            sys.exit(1)
        
        csv_file = sys.argv[idx + 1]
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                content = f.read()
            set_guide, card_summary = parse_cardmarket_wantlist(content)
            print_set_guide(set_guide, card_summary)
            if set_guide:
                export_to_csv(set_guide, "parmguide.csv")
                export_to_markdown(set_guide, card_summary, "parmguide.md")
            sys.exit(0)
        except FileNotFoundError:
            print(f"❌ Kunde inte hitta filen: {csv_file}")
            sys.exit(1)
    
    # Vanligt läge - läs kortnamn
    if len(sys.argv) > 1:
        # Läs från fil
        filename = sys.argv[1]
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                card_names = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        except FileNotFoundError:
            print(f"❌ Kunde inte hitta filen: {filename}")
            sys.exit(1)
    else:
        # Interaktivt läge
        card_names = interactive_mode()
    
    if not card_names:
        print("Inga kort att söka efter!")
        sys.exit(0)
    
    # Kör sökningen
    set_guide, card_summary = build_set_guide(
        card_names,
        cheapest_only=False  # Visa alla printings, markera billigaste
    )
    
    # Skriv ut resultat
    print_set_guide(set_guide, card_summary)
    
    # Exportera
    if set_guide:
        export_to_csv(set_guide, "parmguide.csv")
        export_to_markdown(set_guide, card_summary, "parmguide.md")


if __name__ == "__main__":
    main()