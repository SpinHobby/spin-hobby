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
import { getDisplayCategories, IDisplayCategory } from "../../../api/square";

interface Props {
  onNav?: boolean;
}

const ALL_CATEGORIES: IDisplayCategory = { name: "All Categories", categoryIds: [] };

export default function Search({ onNav = true }: Props) {
  const [search, setSearch] = useState<string>("");
  const [openCategoryList, setOpenCategoryList] = useState<boolean>(false);
  const [category, setCategory] = useState<IDisplayCategory>(ALL_CATEGORIES);
  const [categories, setCategories] = useState<IDisplayCategory[]>([ALL_CATEGORIES]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch the curated display categories (not Square's raw ~64, which are
  // full of duplicates/typos - see the backend's categoryMapping.ts)
  useEffect(() => {
    getDisplayCategories()
      .then((cats) => {
        if (cats.length > 0) setCategories([ALL_CATEGORIES, ...cats]);
      })
      .catch((error) => {
        console.error("Error fetching categories for search:", error);
        // Keep "All Categories" only on error
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

  function handleOnSelectCategory(selectedCategory: IDisplayCategory) {
    setCategory(selectedCategory);
    setOpenCategoryList(false); // Close dropdown after selection
  }

  function onSubmitHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = search.trim();
    if (trimmed.length === 0 && category.categoryIds.length === 0) {
      return; // Nothing to search or browse by
    }

    dispatch(
      getSearch({
        page: 1,
        searchString: trimmed,
        category: category.name,
        categoryIds: category.categoryIds.length > 0 ? category.categoryIds : undefined,
      })
    );

    const searchParams = new URLSearchParams();
    if (trimmed) searchParams.set("q", trimmed);
    if (category.categoryIds.length > 0) {
      searchParams.set("categoryIds", category.categoryIds.join(","));
      searchParams.set("categoryName", category.name);
    }
    searchParams.set("category", category.name);

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
  category: IDisplayCategory;
  categories: IDisplayCategory[];
  handleOnSelectCategory: (category: IDisplayCategory) => void;
}) {
  return (
    <div className="dropdown">
      <ul className="categories" id="categories">
        {categories.map((categoryOption) => (
          <li
            key={categoryOption.name}
            onClick={() => handleOnSelectCategory(categoryOption)}
            className={category.name === categoryOption.name ? "selected" : ""}
          >
            {categoryOption.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
