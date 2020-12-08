import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Redirect } from "react-router";
import tmi from "tmi.js";
import { TabsContext } from "../../../contexts/TabsContext";
import { updateTabsStorage } from "../../../App";
import "./style.css";
import parse from "html-react-parser";
import { OptionsContext } from "../../../contexts/OptionsContext";

const Channel = () => {
  const { removeTab, tabs } = useContext(TabsContext);
  const { options } = useContext(OptionsContext);
  const [channel, setChannel] = useState(
    window.location.hash.replace("#/chat/", "")
  );
  const tab = tabs.find((t) => t.name === channel);
  let isPaused = useRef(false);
  let isConnected = false;
  let showDate = false;
  const messageLimit = options?.messages?.limit ?? 200;
  const smoothScroll = options?.chat?.smoothScroll ?? true;
  let bttvGlobalCached = useRef(null);
  let bttvChannelCached = useRef(null);
  let ffzGlobalCached = useRef(null);

  const client = tmi.client({
    channels: [channel],
    options: {
      clientId: "8amc2k0y3ipgrnjb3yd09inhb16n3e",
      debug: false,
    },
  });

  client.on("connected", () => {
    console.log("Connected");
    isConnected = true;
  });

  client.on("message", (channel, userState, message, self) => {
    if (!self) {
      const container = document.getElementById("messages-container");
      // Make sure the visible messages does not exceed the limit
      if (container.childNodes.length >= messageLimit) {
        const firstChild = container.firstChild;
        if (firstChild !== null) firstChild.remove();
      }
      // Make sure the visible messages does not exceed the limit
      if (tab?.messages.length >= messageLimit) {
        tab.messages.shift();
      }

      const date = new Date();

      let emotesObj = userState.emotes;
      if (emotesObj) {
        message = insertEmotes(message, emotesObj);
      }

      bttvGlobalCached.current.forEach((x) => {
        const match = message.includes(x.code);
        if (match) {
          message = insertBttvEmote(message, x.code, x.id);
        }
      });

      bttvChannelCached.current.sharedEmotes.forEach((x) => {
        const match = message.includes(x.code);
        if (match) {
          message = insertBttvEmote(message, x.code, x.id);
        }
      });

      const msg = `${
        showDate ? date.getHours() + ":" + date.getMinutes() + " " : ""
      }<span style="color: ${
        userState.color ?? "#1c82e7"
      }; font-weight: bold; word-wrap: none;">${
        userState.badges?.broadcaster ? "[B]&nbsp;" : ""
      }${userState.mod ? "[M]&nbsp;" : ""}
      ${userState.subscriber ? "[S]&nbsp;" : ""}${userState.username}</span>${
        userState["message-type"] === "action"
          ? "&nbsp;"
          : "<span>:&nbsp;</span>"
      }${message}`;

      tab.messages.push(msg);

      let msgEl = document.createElement("p");
      msgEl.innerHTML = msg;
      msgEl.classList.add("message");
      if (userState["message-type"] === "action") {
        msgEl.style.color = userState.color;
      }

      container.append(msgEl);
      scrollToBottom();
      updateTabsStorage(tabs);
    }
  });

  const insertBttvEmote = (message, code, id) => {
    if (message === "" || !code) return;
    const stringReplacements = [];
    const start = message.indexOf(code);
    const end = start + code.length;
    const stringToReplace = message.substring(
      parseInt(start, 10),
      parseInt(end, 10) + 1
    );

    stringReplacements.push({
      stringToReplace: stringToReplace,
      replacement: `<img src="https://cdn.betterttv.net/emote/${id}/1x" alt="${stringToReplace}" style="margin: 0 0.25rem">`,
    });
    const messageHTML = stringReplacements.reduce(
      (acc, { stringToReplace, replacement }) => {
        return acc.split(stringToReplace).join(replacement);
      },
      message
    );
    return messageHTML;
  };

  const insertEmotes = (message, emotesObject) => {
    if (message === "" || !emotesObject) return;
    const stringReplacements = [];
    Object.entries(emotesObject).forEach(([id, positions]) => {
      const position = positions[0];
      const [start, end] = position.split("-");
      const stringToReplace = message.substring(
        parseInt(start, 10),
        parseInt(end, 10) + 1
      );

      stringReplacements.push({
        stringToReplace: stringToReplace,
        replacement: `<img src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0" alt="${stringToReplace}" style="margin: 0 0.25rem">`,
      });
    });
    const messageHTML = stringReplacements.reduce(
      (acc, { stringToReplace, replacement }) => {
        return acc.split(stringToReplace).join(replacement);
      },
      message
    );
    return messageHTML;
  };

  const scrollToBottom = useCallback(
    (ignorePause = false, smooth = smoothScroll) => {
      if (!isPaused.current || ignorePause) {
        window.scrollTo({
          behavior: smooth ? "smooth" : "auto",
          top: document.body.scrollHeight,
          left: 0,
        });
      }
    },
    [isPaused, smoothScroll]
  );

  const scrollToTop = (e, smooth = smoothScroll) => {
    if (isPaused.current) {
      window.scrollTo({
        behavior: smooth ? "smooth" : "auto",
        top: 0,
        left: 0,
      });
    }
  };

  const unPause = useCallback(() => {
    scrollToBottom(true);
    isPaused.current = false;
    const el = document.getElementById("paused");
    if (el) {
      isPaused.current = false;
      el.style.display = "none";
    }
  }, [isPaused, scrollToBottom]);

  const pause = useCallback(() => {
    const el = document.getElementById("paused");
    if (el) {
      isPaused.current = true;
      el.style.display = "block";
    }
  }, [isPaused]);

  const handleScrollPause = useCallback(
    (e) => {
      if (
        e.target.classList.contains("navbar-container") ||
        e.target.classList.contains("navbar-link") ||
        e.target.classList.contains("navbar-link-i")
      ) {
        return;
      } else if (e.deltaY < 0) {
        pause();
      }
    },
    [pause]
  );

  const handleKeydownPause = useCallback(
    (e) => {
      if (e.key === "Alt" && !isPaused.current) {
        e.preventDefault();
        pause();
      }
    },
    [isPaused, pause]
  );

  const handleKeyupPause = useCallback(
    (e) => {
      if (e.key === "Alt" && isPaused.current) {
        e.preventDefault();
        unPause();
      }
    },
    [isPaused, unPause]
  );

  const remove = () => {
    removeTab(channel);
    setChannel("");
  };

  useEffect(() => {
    // BTTV Global
    fetch("https://api.betterttv.net/3/cached/emotes/global").then(
      async (res) => {
        bttvGlobalCached.current = await res.json();
      }
    );
    // FFZ Global
    // fetch("https://api.frankerfacez.com/v1/set/global").then(
    //   async (res) => {
    //     ffzGlobalCached.current = await res.json();
    //   }
    // );
    // Get twitch id
    fetch("https://api.frankerfacez.com/v1/user/giantwaffle").then(
      async (res) => {
        const { user } = await res.json();
        // BTTV Channel
        fetch(
          `https://api.betterttv.net/3/cached/users/twitch/${user.twitch_id}`
        ).then(async (res) => {
          bttvChannelCached.current = await res.json();
        });
      }
    );

    if (!isConnected && client.readyState() !== "CONNECTING") {
      client.connect();
      document.addEventListener("wheel", handleScrollPause);
      document.addEventListener("keydown", handleKeydownPause);
      document.addEventListener("keyup", handleKeyupPause);
      scrollToBottom();
    }
    return () => {
      if (isConnected) {
        client.disconnect();
      }
      document.removeEventListener("wheel", handleScrollPause, true);
      document.removeEventListener("keydown", handleKeydownPause, true);
      document.removeEventListener("keyup", handleKeyupPause, true);
      client.removeAllListeners();
    };
  }, [
    isConnected,
    client,
    handleScrollPause,
    handleKeydownPause,
    handleKeyupPause,
    scrollToBottom,
  ]);

  if (channel === "" || tab === null) return <Redirect to="/" />;
  return (
    <div>
      <h1 className="channel-title">{channel}</h1>
      <button onClick={remove} className="channel-remove-btn">
        Remove channel
      </button>
      <div id="messages-container">
        {tab?.messages?.map((m, i) => {
          return (
            <p key={i} className="message">
              {parse(m)}
            </p>
          );
        })}
      </div>
      <div id="paused">
        <button className="paused-btn" onClick={unPause}>
          Chat Paused
        </button>
        <button className="scroll-top-btn" onClick={scrollToTop}>
          <i class="fas fa-arrow-up"></i>
        </button>
      </div>
    </div>
  );
};

export default Channel;
