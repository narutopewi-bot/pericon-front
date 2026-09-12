from datetime import datetime
from sqlalchemy.orm import Session
from src.player.entities.level import Level
from src.common.enums import CardSuit
from src.game.entities.card import Card

def migrate_levels(db: Session):
    """
    Migrates the levels data into the database if they do not already exist.
    """
    existing_levels = db.query(Level).all()
    if existing_levels:
        return

    levels_data = [
        {"name": "Aprendiz", "min_bet": 10, "credit_amount": 1},
        {"name": "Novato", "min_bet": 25, "credit_amount": 2},
        {"name": "Maestro", "min_bet": 50, "credit_amount": 3},
    ]

    for data in levels_data:
        level = Level(
            name=data["name"],
            min_bet=data["min_bet"],
            credit_amount=data["credit_amount"],
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(level)

    db.commit()

def migrate_cards(db: Session):
    """
    Migrates the cards data into the database if they do not already exist.
    """
    existing_cards = db.query(Card).all()
    if existing_cards:
        return

    card_numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
    suits = {
        CardSuit.GOLDS: "gold",
        CardSuit.CUPS: "cups",
        CardSuit.SWORDS: "swords",
        CardSuit.CLUBS: "clubs"
    }

    for suit, suit_str in suits.items():
        for number in card_numbers:
            image_url = f"http://127.0.0.1:5000/images/cards/{number}_{suit_str}.png"
            card = Card(
                suit=suit,
                number=number,
                image=image_url,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(card)

    db.commit()
