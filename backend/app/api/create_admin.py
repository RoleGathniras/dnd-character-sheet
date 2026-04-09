from sqlmodel import Session, select

from app.db import engine
from app.models import Role, User
from app.security import hash_password


def main():
    username = "admin"
    password = "admin"  # danach sofort ändern
    role = Role.admin

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            print(f"User '{username}' existiert bereits.")
            return

        user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        session.add(user)
        session.commit()
        print(f"Admin '{username}' wurde angelegt.")


if __name__ == "__main__":
    main()
