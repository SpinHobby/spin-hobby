import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import { FcSearch } from "react-icons/fc";
import { TiArrowSortedDown, TiArrowSortedUp } from "react-icons/ti";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getSearch } from "../../../reducers";
import { getCategories } from "../../../api/square";

interface Props {
  onNav?: boolean;
}

interface SearchCategory {
  id: string;
  name: string;
}

const DEFAULT_CATEGORIES = [
  { id: "all", name: "All Categories" },
  { id: "figures", name: "Scale Figures" },
  { id: "nendoroids", name: "Nendoroids" },
  { id: "plushies", name: "Plushies" },
  { id: "apparel", name: "Anime Apparel" },
];

export default function Search({ onNav = true }: Props) {
  const [search, setSearch] = useState<string>("");
  const [openCategoryList, setOpenCategoryList] = useState<boolean>(false);
  const [category, setCategory] = useState<SearchCategory>(
    DEFAULT_CATEGORIES[0]
  );
  const [categories, setCategories] =
    useState<SearchCategory[]>(DEFAULT_CATEGORIES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch categories from the Square catalog
  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (cats.length > 0) {
          setCategories([DEFAULT_CATEGORIES[0], ...cats]);
        }
      })
      .catch((error) => {
        console.error("Error fetching categories for search:", error);
        // Keep default categories on error
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenCategoryList(false);
      }
    }

    if (openCategoryList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openCategoryList]);

  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleOpenCategoryList() {
    setOpenCategoryList(!openCategoryList);
  }

  function handleOnSelectCategory(selectedCategory: SearchCategory) {
    setCategory(selectedCategory);
    setOpenCategoryList(false); // Close dropdown after selection
  }

  function onSubmitHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (search.trim().length === 0) {
      return; // Don't search if empty
    }

    // Dispatch search action to Redux
    dispatch(
      getSearch({
        page: 1,
        searchString: search.trim(),
        category: category.name,
      })
    );

    // Navigate to search results page with parameters
    const searchParams = new URLSearchParams({
      q: search.trim(),
      category: category.name,
    });

    navigate(`/search?${searchParams.toString()}`);
  }

  return (
    <div className={`navbar-search${onNav ? "" : " navbar-search-mobile"}`}>
      <div
        ref={dropdownRef}
        className="navbar-search-category-toggler"
        onClick={handleOpenCategoryList}
      >
        <div className="navbar-search-selected-category">{category.name}</div>
        {openCategoryList ? <TiArrowSortedUp /> : <TiArrowSortedDown />}
        {openCategoryList && (
          <div className="dropdown-menu">
            <Dropdown
              category={category}
              categories={categories}
              handleOnSelectCategory={handleOnSelectCategory}
            />
          </div>
        )}
      </div>
      <form onSubmit={onSubmitHandler} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={handleSearchInput}
          />
        </div>
      </form>
      <div className="navbar-search-magnifier">
        <FcSearch size={"1.5em"} />
      </div>
    </div>
  );
}

function Dropdown({
  category,
  categories,
  handleOnSelectCategory,
}: {
  category: SearchCategory;
  categories: SearchCategory[];
  handleOnSelectCategory: (category: SearchCategory) => void;
}) {
  return (
    <div className="dropdown">
      <ul className="categories" id="categories">
        {categories.map((categoryOption) => (
          <li
            key={categoryOption.id}
            onClick={() => handleOnSelectCategory(categoryOption)}
            className={category.id === categoryOption.id ? "selected" : ""}
          >
            {categoryOption.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
